const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

sign_up_btn.addEventListener("click", () => {
    container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
    container.classList.remove("sign-up-mode");
});

// Auth Logic
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Helper to handle API requests
async function authRequest(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    const data = await authRequest('/api/auth/register', { username, email, password, role });

    if (data.auth && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);

        if (data.role === 'owner') window.location.href = '/dashboard.html';
        else if (data.role === 'staff') window.location.href = '/staff.html';
        else if (data.role === 'accountant') window.location.href = '/accountant.html';
        else if (data.role === 'deliverer') window.location.href = '/deliverer.html';
        else window.location.href = '/user.html';
    } else {
        alert(data.message || 'Registration failed');
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const data = await authRequest('/api/auth/login', { email, password });

    if (data.auth && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);

        if (data.role === 'owner') window.location.href = '/dashboard.html';
        else if (data.role === 'staff') window.location.href = '/staff.html';
        else if (data.role === 'accountant') window.location.href = '/accountant.html';
        else if (data.role === 'deliverer') window.location.href = '/deliverer.html';
        else window.location.href = '/user.html';
    } else {
        alert(data.message || 'Login failed Check your credentials');
    }
});
