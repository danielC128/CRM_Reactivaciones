"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false
      });

      if (result?.error) {
        setError("Usuario o contraseña incorrectos");
      } else {
        router.push("/");
      }
    } catch (error) {
      setError("Ocurrió un error al iniciar sesión");
      console.error("Error en login:", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-[#007391] to-[#005c6b] px-4">
      <form onSubmit={handleLogin} className="bg-white shadow-2xl rounded-xl p-10 w-full max-w-md">
        {/* Logo de Maquiplus */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo_maqui.png"
            alt="Maquiplus Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        <h2 className="text-3xl font-extrabold text-center text-[#007391] mb-4">
          Bienvenido de nuevo
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Inicia sesión para acceder a la plataforma
        </p>

        {error && <p className="text-red-500 text-center mb-4 font-semibold">{error}</p>}
        
        <div className="mb-5">
          <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1">
            Usuario
          </label>
          <input
            type="text"
            id="username"
            placeholder="Ingrese su usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007391]"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007391]"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-[#005c6b] font-bold py-2 px-4 rounded-lg transition duration-200"
        >
          Iniciar Sesión
        </button>

        {/*<p className="text-center text-sm text-gray-500 mt-6">
          ¿Olvidaste tu contraseña?{" "}
          <Link href="/recuperar" className="text-[#007391] font-semibold hover:underline">
            Recuperar acceso
          </Link>
        </p>*/}
      </form>
    </div>
  );
}
