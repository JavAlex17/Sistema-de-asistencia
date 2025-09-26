import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCUQBPkuvuNwjJg7X9KCvGn0K48zxfmkKM",
  authDomain: "asistenciaqr-f0677.firebaseapp.com",
  projectId: "asistenciaqr-f0677",
  storageBucket: "asistenciaqr-f0677.firebasestorage.app",
  appId: "1:764725003629:web:42708c2488cf33313a8664",
  measurementId: "G-4MEP29Z0TB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const changePasswordForm = document.getElementById('change-password-form');
const errorMessage = document.getElementById('error-message');

onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si por alguna razón el usuario no está logueado, lo mandamos al login.
        window.location.href = 'index.html';
        return;
    }

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword.length < 6) {
            errorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        if (newPassword !== confirmPassword) {
            errorMessage.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        try {
            // 1. Actualizar la contraseña en Firebase Authentication
            await updatePassword(user, newPassword);

            // 2. Actualizar la "bandera" en Firestore para no volver a pedir el cambio
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                requiresPasswordChange: false
            });

            // 3. Redirigir al panel del trabajador
            alert('¡Contraseña actualizada con éxito! Serás redirigido a tu panel.');
            window.location.href = 'dashboard/trabajador.html';

        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            errorMessage.textContent = 'Ocurrió un error. Inténtalo de nuevo.';
        }
    });
});