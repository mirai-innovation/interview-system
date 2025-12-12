import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import logo from '../assets/logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess('Se ha enviado un correo electrónico con las instrucciones para recuperar tu contraseña.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar el correo. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-4">
          <img
            src={logo}
            alt="Mirai Innovation"
            className="h-10 w-auto object-contain"
          />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">
          Recuperar Contraseña
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Ingresa tu correo electrónico"
              required
            />
            <p className="text-gray-600 text-xs mt-2">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Correo de Recuperación'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm space-y-2">
          <p>
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login" className="text-blue-500 hover:underline">
              Iniciar sesión
            </Link>
          </p>
          <p>
            <Link to="/" className="text-gray-500 hover:text-gray-700 hover:underline">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

