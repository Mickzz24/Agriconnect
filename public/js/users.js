const token = localStorage.getItem('token');
(function () {
    if (!token && window.location.pathname.includes('users.html')) {
        window.location.href = '/';
    }
})();

const usersTableBody = document.querySelector('#usersTable tbody');
const addUserForm = document.getElementById('addUserForm');
const messageEl = document.getElementById('message');
const submitBtn = addUserForm ? addUserForm.querySelector('button[type="submit"]') : null;
let editingId = null;
let usersData = [];

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

        usersData = await response.json();
        renderUsers(usersData);
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

function renderUsers(users) {
    usersTableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        const statusBadge = user.is_approved
            ? '<span style="color: green; font-weight: bold;"><i class="fas fa-check-circle"></i> Approved</span>'
            : '<span style="color: orange; font-weight: bold;"><i class="fas fa-clock"></i> Pending</span>';

        // Show Approve button only if it's a deliverer and not approved
        const approveBtn = (user.role === 'deliverer' || user.role === 'staff')
            ? `<button class="btn-action ${user.is_approved ? 'btn-danger' : 'btn-primary'}" onclick="toggleApproval(${user.id}, ${!user.is_approved})" style="background: ${user.is_approved ? '#f39c12' : '#27ae60'}; color: white;">
                <i class="fas ${user.is_approved ? 'fa-user-slash' : 'fa-user-check'}"></i> ${user.is_approved ? 'Suspend' : 'Approve'}
               </button>`
            : '';

        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role.toUpperCase()}</td>
            <td>${statusBadge}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                ${approveBtn}
                <button class="btn-action btn-edit" title="Edit" onclick="editUser(${user.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-action btn-danger" title="Delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i> Delete</button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

window.toggleApproval = async (id, status) => {
    try {
        const response = await fetch(`/api/users/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ is_approved: status })
        });

        if (response.ok) {
            fetchUsers();
        } else {
            alert('Error updating status');
        }
    } catch (err) {
        console.error('Error toggling approval:', err);
    }
};

// Add/Update User
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            role: document.getElementById('role').value
        };

        // Only include password if we're not editing or if password field is filled
        const password = document.getElementById('password').value;
        if (password) userData.password = password;

        try {
            let response;
            if (editingId) {
                response = await fetch(`/api/users/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify(userData)
                });
            } else {
                if (!password) {
                    alert('Password is required for new users');
                    return;
                }
                response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify(userData)
                });
            }

            const data = await response.json();

            if (response.ok) {
                messageEl.textContent = editingId ? 'User updated successfully!' : 'User added successfully!';
                messageEl.style.color = 'green';
                addUserForm.reset();
                resetUserEditMode();
                fetchUsers();
            } else {
                messageEl.textContent = data.message || 'Error saving user.';
                messageEl.style.color = 'red';
            }
        } catch (err) {
            console.error('Error saving user:', err);
        }
    });
}

window.editUser = function (id) {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('role').value = user.role;
    document.getElementById('password').placeholder = 'Leave blank to keep current password';
    document.getElementById('password').required = false;

    editingId = id;
    if (submitBtn) {
        submitBtn.innerText = 'Update User';
    }

    if (!document.getElementById('btn-cancel-user-edit')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'btn-cancel-user-edit';
        cancelBtn.type = 'button';
        cancelBtn.innerText = 'Cancel';
        cancelBtn.className = 'btn-action';
        cancelBtn.style.color = 'white';
        cancelBtn.style.marginTop = '10px';
        cancelBtn.onclick = resetUserEditMode;
        addUserForm.appendChild(cancelBtn);
    }
};

function resetUserEditMode() {
    editingId = null;
    if (submitBtn) {
        submitBtn.innerText = 'Add User';
    }
    const passInput = document.getElementById('password');
    if (passInput) {
        passInput.placeholder = 'Password';
        passInput.required = true;
    }
    const cancelBtn = document.getElementById('btn-cancel-user-edit');
    if (cancelBtn) cancelBtn.remove();
    addUserForm.reset();
}

// Delete User
window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            fetchUsers();
            if (editingId === id) resetUserEditMode();
        } else {
            alert('Error deleting user.');
        }
    } catch (err) {
        console.error('Error deleting user:', err);
    }
};

// Initial Fetch (only if on standalone page)
if (window.location.pathname.includes('users.html')) {
    fetchUsers();
}
