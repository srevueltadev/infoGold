'use client'
import React, { useState } from 'react';

interface LoginProps {
    onLoginSuccessAction: (token: string) => void;
}

export default function Login({ onLoginSuccessAction }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                signal: AbortSignal.timeout(10000),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authExpiry', String(Date.now() + data.expiresIn));
                onLoginSuccessAction(data.token);
            } else {
                setError(data.error || 'Error al iniciar sesión');
            }
        } catch (e) {
            const isTimeout = e instanceof DOMException && e.name === 'TimeoutError';
            setError(isTimeout ? 'El servidor no responde, intenta de nuevo' : 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <p>Ingrese sus credenciales para continuar</p>
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Usuario</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Usuario"
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <div className="login-error">{error}</div>}
                    <button type="submit" disabled={loading} className="login-button">
                        {loading ? 'Verificando...' : 'Acceder al Sistema'}
                    </button>
                </form>
            </div>
        </div>
    );
}
