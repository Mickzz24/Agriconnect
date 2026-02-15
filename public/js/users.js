// public/js/users.js
(function () {
    // Persistent state within this closure only
    let _usersData = [];
    let _editingId = null;

    // Helper to get token safely without clashing with global 'token' variable
    const getSafeToken = () => localStorage.getItem('token');

    window.fetchUsers = async function () {
        console.log("Fetching users...");
        const activeToken = getSafeToken();
        const tableBody = document.querySelector('#usersTable tbody');

        if (!tableBody) {
            console.error("Users table body not found in DOM");
            return;
        }

        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': activeToken }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Unauthorized Access. Redirecting to login.');
                localStorage.clear();
                window.location.href = '/';
                return;
            }

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            _usersData = Array.isArray(data) ? data : [];
            console.log(`Loaded ${_usersData.length} users`);
            window.renderUsers(_usersData);
        } catch (err) {
            console.error('Error fetching users:', err);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Error loading users: ${err.message}</td></tr>`;
        }
    };

    window.renderUsers = function (users) {
        const tableBody = document.querySelector('#usersTable tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (!users || users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No registered accounts found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            const statusBadge = user.is_approved
                ? '<span style="color: #27ae60; font-weight: 600;"><i class="fas fa-check-circle"></i> Approved</span>'
                : '<span style="color: #e67e22; font-weight: 600;"><i class="fas fa-clock"></i> Pending</span>';

            const approveBtn = (user.role !== 'owner')
                ? `<button class="btn-action" onclick="window.toggleApproval(${user.id}, ${!user.is_approved})" style="background: ${user.is_approved ? '#f39c12' : '#27ae60'}; color: white; margin-bottom: 5px; min-width: 110px;">
                    <i class="fas ${user.is_approved ? 'fa-user-slash' : 'fa-user-check'}"></i> ${user.is_approved ? 'Suspend' : 'Approve'}
                   </button>`
                : '';

            const roles = ['user', 'staff', 'accountant', 'deliverer', 'owner'];
            const roleOptions = roles.map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r.toUpperCase()}</option>`).join('');

            tr.innerHTML = `
                <td><div style="font-weight: 600; color: #2c3e50;">${user.username}</div></td>
                <td><div style="color: #7f8c8d; font-size: 0.9rem;">${user.email}</div></td>
                <td>
                    <select onchange="window.updateUserRole(${user.id}, this.value)" style="padding: 6px; border-radius: 6px; border: 1px solid #ddd; background: #fff; font-weight: 600; cursor: pointer;">
                        ${roleOptions}
                    </select>
                </td>
                <td>${statusBadge}</td>
                <td style="font-size: 0.85rem; color: #95a5a6;">${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        ${approveBtn}
                        <button class="btn-action btn-edit" onclick="window.editUser(${user.id})" title="Edit Profile"><i class="fas fa-edit"></i></button>
                        <button class="btn-action btn-danger" onclick="window.deleteUser(${user.id})" title="Remove User"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    };

    window.updateUserRole = async (id, newRole) => {
        if (!confirm(`Confirm role change to ${newRole.toUpperCase()}?`)) {
            window.fetchUsers();
            return;
        }

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getSafeToken()
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                window.fetchUsers();
            } else {
                const data = await response.json();
                alert(data.message || 'Update failed');
                window.fetchUsers();
            }
        } catch (err) {
            console.error('Error:', err);
            window.fetchUsers();
        }
    };

    window.toggleApproval = async (id, status) => {
        try {
            const response = await fetch(`/api/users/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getSafeToken()
                },
                body: JSON.stringify({ is_approved: status })
            });

            if (response.ok) {
                window.fetchUsers();
            }
        } catch (err) {
            console.error('Error toggling approval:', err);
        }
    };

    window.editUser = function (id) {
        const user = _usersData.find(u => u.id === id);
        if (!user) return;

        const unInput = document.getElementById('username');
        const emInput = document.getElementById('email');
        const rlInput = document.getElementById('role');
        const psInput = document.getElementById('password');

        if (unInput) unInput.value = user.username;
        if (emInput) emInput.value = user.email;
        if (rlInput) rlInput.value = user.role;
        if (psInput) {
            psInput.placeholder = 'Leave blank to keep current password';
            psInput.required = false;
        }

        _editingId = id;
        const submitBtn = document.querySelector('#addUserForm button[type="submit"]');
        if (submitBtn) submitBtn.innerText = 'Update User Details';

        if (!document.getElementById('btn-cancel-user-edit')) {
            const form = document.getElementById('addUserForm');
            if (form) {
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'btn-cancel-user-edit';
                cancelBtn.type = 'button';
                cancelBtn.innerText = 'Cancel Edit';
                cancelBtn.className = 'btn-action';
                cancelBtn.style.background = '#95a5a6';
                cancelBtn.style.color = 'white';
                cancelBtn.style.marginTop = '10px';
                cancelBtn.onclick = window.resetUserEditMode;
                form.appendChild(cancelBtn);
            }
        }
    };

    window.resetUserEditMode = function () {
        _editingId = null;
        const submitBtn = document.querySelector('#addUserForm button[type="submit"]');
        if (submitBtn) submitBtn.innerText = 'Add New User';

        const passInput = document.getElementById('password');
        if (passInput) {
            passInput.placeholder = 'Password';
            passInput.required = true;
        }
        const cancelBtn = document.getElementById('btn-cancel-user-edit');
        if (cancelBtn) cancelBtn.remove();
        const form = document.getElementById('addUserForm');
        if (form) form.reset();
    };

    window.deleteUser = async (id) => {
        if (!confirm('Are you sure you want to permanently delete this user?')) return;

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getSafeToken() }
            });

            if (response.ok) {
                window.fetchUsers();
                if (_editingId === id) window.resetUserEditMode();
            } else {
                const data = await response.json();
                alert(data.message || 'Delete failed');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    // Form Listener using Event Delegation on document for robustness
    document.addEventListener('submit', async (e) => {
        if (e.target && e.target.id === 'addUserForm') {
            e.preventDefault();
            const messageEl = document.getElementById('message');

            const userData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                role: document.getElementById('role').value
            };

            const password = document.getElementById('password').value;
            if (password) userData.password = password;

            try {
                let response;
                if (_editingId) {
                    response = await fetch(`/api/users/${_editingId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': getSafeToken() },
                        body: JSON.stringify(userData)
                    });
                } else {
                    if (!password) {
                        alert('Password is required for new users');
                        return;
                    }
                    response = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': getSafeToken() },
                        body: JSON.stringify(userData)
                    });
                }

                if (response.ok) {
                    if (messageEl) {
                        messageEl.textContent = 'User saved successfully!';
                        messageEl.style.color = '#27ae60';
                    }
                    window.resetUserEditMode();
                    window.fetchUsers();
                } else {
                    const data = await response.json();
                    if (messageEl) {
                        messageEl.textContent = data.message || 'Error saving user';
                        messageEl.style.color = '#e74c3c';
                    }
                }
            } catch (err) {
                console.error(err);
                if (messageEl) messageEl.textContent = "Network error";
            }
        }
    });

    // Initial load check for standalone page
    if (window.location.pathname.includes('users.html')) {
        window.addEventListener('load', window.fetchUsers);
    }
})();

