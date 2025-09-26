// 🧠 PASO 1: IMPORTAR LAS FUNCIONES NECESARIAS
// Importamos la función para inicializar y las de Autenticación y Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"; // Usamos la versión más reciente
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 📄 PASO 2: TU CONFIGURACIÓN DE FIREBASE (LA QUE TE DIERON)
const firebaseConfig = {
  apiKey: "AIzaSyCUQBPkuvuNwjJg7X9KCvGn0K48zxfmkKM",
  authDomain: "asistenciaqr-f0677.firebaseapp.com",
  projectId: "asistenciaqr-f0677",
  storageBucket: "asistenciaqr-f0677.firebasestorage.app",
  appId: "1:764725003629:web:42708c2488cf33313a8664",
  measurementId: "G-4MEP29Z0TB"
};

// 🚀 PASO 3: INICIALIZAR FIREBASE Y LOS SERVICIOS
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 👇 PASO 4: TODA LA LÓGICA DE TU APLICACIÓN
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = loginForm['email'].value;
    const password = loginForm['password'].value;
    errorMessage.textContent = '';

    // ✅ Validación de dominio (sin cambios)
    const allowedDomain = "@lagrimasdelsur.cl";
    if (!email.endsWith(allowedDomain)) {
        errorMessage.textContent = `Solo se permiten correos con dominio ${allowedDomain}`;
        return; 
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data(); // Obtenemos todos los datos del usuario
            const role = userData.role;

            // --- INICIO DE LA MODIFICACIÓN ---
            // Verificamos si es un trabajador que necesita cambiar su contraseña
            if (role === 'trabajador' && userData.requiresPasswordChange === true) {
                // Si es así, lo redirigimos a la página de cambio de contraseña
                window.location.href = 'cambiar-password.html';
            } else {
                // Si no, procedemos con la redirección normal según su rol
                switch (role) {
                    case 'admin':
                        window.location.href = './dashboard/admin.html';
                        break;
                    case 'trabajador':
                        window.location.href = './dashboard/trabajador.html';
                        break;
                    default:
                        errorMessage.textContent = 'Rol no asignado.';
                        signOut(auth);
                }
            }
            // --- FIN DE LA MODIFICACIÓN ---

        } else {
            errorMessage.textContent = 'Error en los datos de usuario.';
            signOut(auth);
        }
    } catch (error) {
        errorMessage.textContent = 'Correo o contraseña incorrectos.';
        console.error("Error de autenticación:", error.message);
    }
});