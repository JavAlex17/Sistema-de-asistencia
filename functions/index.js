const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * Cloud Function para crear un nuevo usuario.
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // 1. Verificar que el usuario que llama esté autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "La función solo puede ser llamada por un usuario autenticado."
    );
  }

  // 2. OBTENER EL ROL DEL USUARIO DIRECTAMENTE DESDE EL SERVIDOR DE AUTH (MÉTODO SEGURO)
  const callerUid = context.auth.uid;
  const callerUserRecord = await admin.auth().getUser(callerUid);
  
  if (callerUserRecord.customClaims?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo los administradores pueden crear usuarios."
    );
  }

  // Si pasa la verificación, el resto del código se ejecuta.
  const { email, password, role } = data;

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: role });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: email,
      role: role,
      status: "active",
      requiresPasswordChange: true,
    });

    return { result: `Usuario ${email} creado exitosamente.` };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Cloud Function para actualizar el estado de un usuario.
 */
exports.updateUserStatus = functions.https.onCall(async (data, context) => {
  // (Esta función ya usa una verificación que es aceptable, pero la actualizaremos
  // por consistencia y máxima seguridad)

  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "La función solo puede ser llamada por un usuario autenticado."
    );
  }

  const callerUid = context.auth.uid;
  const callerUserRecord = await admin.auth().getUser(callerUid);

  if (callerUserRecord.customClaims?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo los administradores pueden modificar usuarios."
    );
  }
  
  const { uid, status } = data;

  try {
    await admin.auth().updateUser(uid, { disabled: status === "inactive" });
    await admin.firestore().collection("users").doc(uid).update({ status });
    return { result: `Estado del usuario actualizado a ${status}.` };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});