import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";



// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCUQBPkuvuNwjJg7X9KCvGn0K48zxfmkKM",
  authDomain: "asistenciaqr-f0677.firebaseapp.com",
  projectId: "asistenciaqr-f0677",
  storageBucket: "asistenciaqr-f0677.firebasestorage.app",
  appId: "1:764725003629:web:42708c2488cf33313a8664",
  measurementId: "G-4MEP29Z0TB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
window.auth = auth; // <-- Añade esta línea para depuración
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Referencias a las Cloud Functions
const createUser = httpsCallable(functions, 'createUser');
const updateUserStatus = httpsCallable(functions, 'updateUserStatus');
const addAdminRole = httpsCallable(functions, 'addAdminRole');

// --- Las funciones que se llamarán más tarde pueden quedar aquí ---
async function displayUsers() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    userList.innerHTML = '';
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

function resetForm() {
    const userForm = document.getElementById('user-form');
    const formTitle = document.getElementById('form-title');
    const userIdInput = document.getElementById('user-id');
    const userEmailInput = document.getElementById('user-email');
    const userPasswordInput = document.getElementById('user-password');
    const formSubmitButton = document.getElementById('form-submit-button');
    const formCancelButton = document.getElementById('form-cancel-button');
    
    userForm.reset();
    formTitle.textContent = 'Agregar Nuevo Usuario';
    userIdInput.value = '';
    userEmailInput.disabled = false;
    userPasswordInput.placeholder = "Contraseña (obligatoria para usuarios nuevos)";
    formSubmitButton.textContent = 'Agregar Usuario';
    formCancelButton.style.display = 'none';
}


// --- TODA LA LÓGICA QUE MANIPULA EL HTML VA AQUÍ DENTRO ---
document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const menuLinks = document.querySelectorAll('.sidebar nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const body = document.body;
    const sidebarLinks = document.querySelectorAll('.sidebar a, .sidebar #logout-button');
    const userList = document.getElementById('user-list');
    const userForm = document.getElementById('user-form');
    const formCancelButton = document.getElementById('form-cancel-button');

    // Lógica de navegación de secciones
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            menuLinks.forEach(l => l.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));
            const targetId = link.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            link.classList.add('active');
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Lógica para el menú hamburguesa en móviles
    const closeSidebar = () => body.classList.remove('sidebar-open');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => body.classList.toggle('sidebar-open'));
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    sidebarLinks.forEach(link => {
        if (link.id !== 'logout-button') {
            link.addEventListener('click', closeSidebar);
        }
    });
    

    // Lógica del formulario (MOVIDA AQUÍ DENTRO)
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formSubmitButton = document.getElementById('form-submit-button');
        const userIdInput = document.getElementById('user-id');
        const userEmailInput = document.getElementById('user-email');
        const userPasswordInput = document.getElementById('user-password');
        const userRoleInput = document.getElementById('user-role');

        formSubmitButton.disabled = true;

        try {
            if (!auth.currentUser) {
                throw new Error('No hay sesión iniciada.');
            }

            // Obtenemos el token de autenticación del usuario actual
            const token = await auth.currentUser.getIdToken();
            const uid = userIdInput.value;

            if (uid) {
                // Lógica para editar (la dejamos pendiente, enfócate en crear primero)
                alert('La edición aún no está implementada con el nuevo método.');
            } else {
                // --- Creación de Usuario con el nuevo método ---
                const email = userEmailInput.value;
                const password = userPasswordInput.value;
                const role = userRoleInput.value;

                if (!password) {
                    alert("La contraseña es obligatoria para crear un nuevo usuario.");
                    formSubmitButton.disabled = false;
                    return;
                }

                // Usamos 'fetch' para llamar a nuestra nueva función HTTP
                const response = await fetch('https://us-central1-asistenciaqr-f0677.cloudfunctions.net/createUser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ data: { email, password, role } })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText);
                }
                
                const result = await response.json();
                alert(result.data.result);
                resetForm();
                await displayUsers();
            }
        } catch (error) {
            console.error("Error en el formulario:", error);
            alert("Ocurrió un error: " + error.message);
        }

        formSubmitButton.disabled = false;
    });
    
    // Lógica de los botones de la lista de usuarios (MOVIDA AQUÍ DENTRO)
    userList.addEventListener('click', async (e) => {
        const target = e.target;
        const uid = target.dataset.uid;
        if (!uid) return;

        if (target.classList.contains('edit')) {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) return;
            const userData = userDoc.data();
            
            document.getElementById('form-title').textContent = 'Editar Usuario';
            document.getElementById('user-id').value = uid;
            document.getElementById('user-email').value = userData.email;
            document.getElementById('user-email').disabled = true;
            document.getElementById('user-password').placeholder = "Dejar en blanco para no cambiar";
            document.getElementById('user-password').value = "";
            document.getElementById('user-role').value = userData.role;
            document.getElementById('form-submit-button').textContent = 'Guardar Cambios';
            document.getElementById('form-cancel-button').style.display = 'inline-block';
            window.scrollTo(0, 0);
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

    // Lógica del botón Cancelar (MOVIDO AQUÍ DENTRO)
    formCancelButton.addEventListener('click', resetForm);

    // Lógica del botón Cerrar Sesión (MOVIDO AQUÍ DENTRO)
    document.getElementById('logout-button').addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error('Error al cerrar sesión:', error);
        });
    });
});


// --- Lógica de Autenticación de Firebase (Esto está bien aquí afuera) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            await user.getIdToken(true);
            console.log("Acceso de administrador concedido.");
            await displayUsers(); // Llama a la función para mostrar usuarios
        } else {
            console.log("Acceso denegado. No es administrador.");
            window.location.href = '../index.html';
        }
    } else {
        console.log("Usuario no autenticado.");
        window.location.href = '../index.html';
    }
});
// --- Asignar rol de admin ---
const makeAdminBtn = document.getElementById("makeAdminBtn");

if (makeAdminBtn) {
  makeAdminBtn.addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value.trim();
    const output = document.getElementById("makeAdminOutput");

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      alert("Debes ingresar un correo válido (ejemplo: usuario@dominio.com).");
      return;
    }

    try {
      console.log("📨 Enviando correo a addAdminRole:", email);
      const addAdminRole = httpsCallable(functions, "addAdminRole");
      const res = await addAdminRole({ email });

      console.log("✅ Respuesta addAdminRole:", res.data);
      output.textContent = JSON.stringify(res.data, null, 2);
    } catch (err) {
      console.error("❌ Error en addAdminRole:", err);
      output.textContent = "Error: " + err.message;
    }
  });
}
