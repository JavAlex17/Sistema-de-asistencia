const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * Cloud Function para crear un nuevo usuario en Authentication y Firestore.
 * Se llama desde el panel de administrador.
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // Verificar que la solicitud viene de un administrador.
  // Primero, revisamos que el usuario esté autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "La función solo puede ser llamada por un usuario autenticado.",
    );
  }
  // Luego, verificamos que tenga el rol de admin.
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Solo los administradores pueden crear usuarios.",
    );
  }

  const {email, password, role} = data;

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {role: role});

    // Guardar información del usuario en Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: email,
      role: role,
      status: "active",
      requiresPasswordChange: true, // ¡NUEVA LÍNEA! Marca al usuario para el cambio.
    });

    return {result: `Usuario ${email} creado exitosamente.`};
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Cloud Function para actualizar el estado de un usuario (activo/inactivo).
 */
exports.updateUserStatus = functions.https.onCall(async (data, context) => {
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Solo los administradores pueden modificar usuarios.",
    );
  }

  const {uid, status} = data;

  try {
    // Actualizar el estado en Authentication (activar/desactivar)
    await admin.auth().updateUser(uid, {disabled: status === "inactive"});

    // Actualizar el estado en Firestore
    await admin.firestore().collection("users").doc(uid).update({status});

    return {result: `Estado del usuario actualizado a ${status}.`};
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});