const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/';
}

const usersTableBody = document.querySelector('#usersTable tbody');
const addUserForm = document.getElementById('addUserForm');
const messageEl = document.getElementById('message');

// Fetch and display users
async function fetchUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': token }
        });

        if (response.status === 401 || response.status === 403) {
            alert('Unauthorized. Please login again.');
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }

        const users = await response.json();
        renderUsers(users);
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

function renderUsers(users) {
    usersTableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-danger" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

// Add User
addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value; // Get role from select

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ username, email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = 'User added successfully!';
            messageEl.style.color = 'green';
            addUserForm.reset();
            fetchUsers(); // Refresh list
        } else {
            messageEl.textContent = data.message || 'Error adding user.';
            messageEl.style.color = 'red';
        }
    } catch (err) {
        console.error('Error adding user:', err);
        messageEl.textContent = 'Server error.';
        messageEl.style.color = 'red';
    }
});

// Delete User
window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            fetchUsers(); // Refresh list
        } else {
            alert('Error deleting user.');
        }
    } catch (err) {
        console.error('Error deleting user:', err);
    }
};

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/';
});

// Initial Fetch
fetchUsers();
