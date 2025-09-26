import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// Tu configuración de Firebase (la misma de app.js)
const firebaseConfig = {
    // ... Pega tu firebaseConfig aquí ...
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Referencias a las Cloud Functions
const createUser = httpsCallable(functions, 'createUser');
const updateUserStatus = httpsCallable(functions, 'updateUserStatus');


// --- Protección de Ruta y Carga de Datos ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario logueado, verificar si es admin
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            console.log("Acceso de administrador concedido.");
            await displayUsers();
        } else {
            // No es admin o no tiene rol, redirigir
            console.log("Acceso denegado. No es administrador.");
            window.location.href = '../index.html';
        }
    } else {
        // No hay usuario logueado, redirigir
        console.log("Usuario no autenticado.");
        window.location.href = '../index.html';
    }
});

// --- Lógica para Mostrar Usuarios ---
const userList = document.getElementById('user-list');

async function displayUsers() {
    userList.innerHTML = ''; // Limpiar la tabla antes de llenarla
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);

    userSnapshot.forEach(doc => {
        const userData = doc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${userData.email}</td>
            <td>${userData.role}</td>
            <td>${userData.status || 'active'}</td>
            <td class="actions">
                <button class="edit" data-uid="${doc.id}" ${userData.role === 'admin' ? 'disabled' : ''}>Editar</button>
                <button class="deactivate" data-uid="${doc.id}" data-status="${userData.status || 'active'}" ${userData.role === 'admin' ? 'disabled' : ''}>
                    ${(userData.status || 'active') === 'active' ? 'Desactivar' : 'Activar'}
                </button>
            </td>
        `;
        userList.appendChild(row);
    });
}


// --- Lógica del Formulario (Agregar y Editar) ---
const userForm = document.getElementById('user-form');
const formTitle = document.getElementById('form-title');
const formSubmitButton = document.getElementById('form-submit-button');
const formCancelButton = document.getElementById('form-cancel-button');
const userIdInput = document.getElementById('user-id');
const userEmailInput = document.getElementById('user-email');
const userPasswordInput = document.getElementById('user-password');
const userRoleInput = document.getElementById('user-role');


userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = userIdInput.value;

    if (uid) {
        // Lógica de Edición
        const newRole = userRoleInput.value;
        const userDocRef = doc(db, 'users', uid);
        try {
            await updateDoc(userDocRef, { role: newRole });
            alert('Rol de usuario actualizado.');
            resetForm();
            await displayUsers();
        } catch (error) {
            console.error("Error al actualizar el rol:", error);
            alert("Error al actualizar el rol.");
        }
    } else {
        // Lógica de Creación
        const email = userEmailInput.value;
        const password = userPasswordInput.value;
        const role = userRoleInput.value;

        if (!password) {
            alert("La contraseña es obligatoria para crear un nuevo usuario.");
            return;
        }

        try {
            await createUser({ email, password, role });
            alert(`Usuario ${email} creado.`);
            resetForm();
            await displayUsers();
        } catch (error) {
            console.error("Error al crear usuario:", error);
            alert("Error al crear usuario: " + error.message);
        }
    }
});

// --- Lógica de los Botones de Acción en la Tabla ---
userList.addEventListener('click', async (e) => {
    const target = e.target;
    const uid = target.dataset.uid;

    if (target.classList.contains('edit')) {
        // Rellenar el formulario para editar
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();

        formTitle.textContent = 'Editar Usuario';
        userIdInput.value = uid;
        userEmailInput.value = userData.email;
        userEmailInput.disabled = true; // No permitir cambiar el email
        userPasswordInput.placeholder = "Dejar en blanco para no cambiar";
        userRoleInput.value = userData.role;
        formSubmitButton.textContent = 'Guardar Cambios';
        formCancelButton.style.display = 'inline-block';
    }

    if (target.classList.contains('deactivate')) {
        const currentStatus = target.dataset.status;
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        if (confirm(`¿Seguro que quieres ${newStatus === 'inactive' ? 'desactivar' : 'activar'} a este usuario?`)) {
            try {
                await updateUserStatus({ uid, status: newStatus });
                alert(`Usuario ${newStatus === 'inactive' ? 'desactivado' : 'activado'}.`);
                await displayUsers();
            } catch (error) {
                console.error("Error al cambiar estado:", error);
                alert("Error al cambiar estado: " + error.message);
            }
        }
    }
});


// --- Funciones Auxiliares ---
function resetForm() {
    userForm.reset();
    formTitle.textContent = 'Agregar Nuevo Usuario';
    userIdInput.value = '';
    userEmailInput.disabled = false;
    userPasswordInput.placeholder = "";
    formSubmitButton.textContent = 'Agregar Usuario';
    formCancelButton.style.display = 'none';
}

formCancelButton.addEventListener('click', resetForm);

document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '../index.html';
    }).catch((error) => {
        console.error('Error al cerrar sesión:', error);
    });
});