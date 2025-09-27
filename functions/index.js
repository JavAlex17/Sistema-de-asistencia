const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Importamos y configuramos CORS

admin.initializeApp();

/**
 * -----------------------------------------------------------------------------
 * FUNCIÓN DE UTILIDAD PARA ASIGNAR EL ROL DE ADMINISTRADOR
 * -----------------------------------------------------------------------------
 * Esta función es una herramienta para que, por primera vez, puedas darte
 * a ti mismo el "rol oficial" de admin. Una vez desplegada, la puedes ejecutar
 * desde la consola de Firebase.
 */
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  try {
    // Busca al usuario por su correo electrónico.
    const user = await admin.auth().getUserByEmail(data.email);

    // Le asigna el "custom claim" (la estampa oficial) de 'admin'.
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin'
    });

    // También se asegura de que el rol esté sincronizado en Firestore.
    await admin.firestore().collection('users').doc(user.uid).set({
      role: 'admin'
    }, { merge: true });

    return { message: `Éxito! El usuario ${data.email} ahora es administrador.` };
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});


/**
 * -----------------------------------------------------------------------------
 * Cloud Function para crear un nuevo usuario (MÉTODO MODIFICADO - onRequest).
 * -----------------------------------------------------------------------------
 * Esta versión verifica el token manualmente para evitar el problema de `context.auth`.
 */
exports.createUser = functions.https.onRequest((req, res) => {
  // Habilitamos CORS para que el navegador no bloquee la solicitud
  cors(req, res, async () => {
    // 1. Verificar que la solicitud sea de tipo POST
    if (req.method !== 'POST') {
      return res.status(405).send('Método no permitido');
    }

    try {
      // 2. Verificar el token de autorización del que llama desde las cabeceras
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).send('No autorizado: Token no proporcionado.');
      }
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // 3. Verificar que el que llama es administrador a través del token decodificado
      if (decodedToken.role !== 'admin') {
        return res.status(403).send('Permiso denegado: Se requiere rol de administrador.');
      }

      // 4. Proceder a crear el usuario (los datos vienen en req.body.data)
      const { email, password, role } = req.body.data;
      if (!email || !password || !role) {
        return res.status(400).send("Faltan los campos email, password o role.");
      }

      const userRecord = await admin.auth().createUser({ email, password, emailVerified: true });
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });
      await admin.firestore().collection("users").doc(userRecord.uid).set({ 
        email: email, 
        role: role, 
        status: "active" 
      });

      return res.status(200).json({ data: { result: `Usuario ${email} creado exitosamente.` } });

    } catch (error) {
      console.error("Error en createUser:", error);
      return res.status(500).send('Error interno: ' + error.message);
    }
  });
});


/**
 * -----------------------------------------------------------------------------
 * Cloud Function para actualizar el estado de un usuario (MÉTODO MODIFICADO - onRequest).
 * -----------------------------------------------------------------------------
 */
exports.updateUserStatus = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // 1. Verificar que la solicitud sea de tipo POST
    if (req.method !== 'POST') {
      return res.status(405).send('Método no permitido');
    }

    try {
      // 2. Verificar el token de autorización del que llama
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).send('No autorizado: Token no proporcionado.');
      }
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // 3. Verificar que el que llama es administrador
      if (decodedToken.role !== 'admin') {
        return res.status(403).send('Permiso denegado: Se requiere rol de administrador.');
      }

      // 4. Proceder a actualizar el estado del usuario
      const { uid, status } = req.body.data;
      if (!uid || !status) {
        return res.status(400).send("Faltan los campos uid o status.");
      }

      await admin.auth().updateUser(uid, { disabled: status === "inactive" });
      await admin.firestore().collection("users").doc(uid).update({ status });
      
      return res.status(200).json({ data: { result: `Estado del usuario actualizado a ${status}.` } });

    } catch (error) {
      console.error("Error en updateUserStatus:", error);
      return res.status(500).send('Error interno: ' + error.message);
    }
  });
});