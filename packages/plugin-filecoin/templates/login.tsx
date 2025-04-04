// client/src/components/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async () => {
        // Replace with your authentication logic
        if (username === 'admin' && password === 'password') {
            localStorage.setItem('isLoggedIn', 'true');
            navigate('/app'); // Redirect to the main app after login
        } else {
            alert('Invalid credentials');
        }
    };

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="bg-white p-8 rounded shadow-md">
                <h2 className="text-2xl font-bold mb-4">Login</h2>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 mb-2 border rounded"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 mb-4 border rounded"
                />
                <button onClick={handleLogin} className="bg-blue-500 text-white p-2 rounded">
                    Login
                </button>
            </div>
        </div>
    );
}

export default Login;