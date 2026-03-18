// import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import prisma from "@/lib/prisma";
// import bcrypt from "bcryptjs";

// export const authOptions = {
//   providers: [
//     CredentialsProvider({
//       name: "credentials",
//       credentials: {
//         username: { label: "Usuario", type: "text" },
//         password: { label: "Contraseña", type: "password" },
//       },
//       async authorize(credentials) {
//         try {
//           console.log("🔍 Autenticando usuario:", credentials.username);

//           // 🔹 Buscar usuario en PostgreSQL
//           const usuario = await prisma.usuario.findUnique({
//             where: { username: credentials.username },
//             include: { rol: true },
//           });

//           if (!usuario) throw new Error("Usuario no encontrado.");

//           // 🔑 Validar contraseña (Si aún no está encriptada, usa comparación simple)
//           const esPasswordCorrecto = await bcrypt.compare(credentials.password, usuario.password);
//           const esPasswordCorrecto2 = credentials.password === usuario.password;

//           if (!esPasswordCorrecto && !esPasswordCorrecto2) throw new Error("Contraseña incorrecta.");

//           return {
//             id: usuario.usuario_id,
//             name: usuario.username,
//             email: usuario.email,
//             role: usuario.rol.nombre_rol, // 🔹 Se obtiene el rol del backend
//             tokenExpires: Date.now() + 3600 * 1000, // 🔹 Expiración en 1 hora
//           };
//         } catch (error) {
//           console.error("❌ Error en autenticación:", error.message);
//           throw new Error(error.message);
//         }
//       },
//     }),
//   ],
//   pages: {
//     signIn: "/login", // 🔹 Página de inicio de sesión
//   },
//   // Usa expiración nativa (opcional y recomendado)
//   session: {
//     strategy: "jwt",
//     maxAge: 60 * 60, // 1 hora
//   },
//   jwt: {
//     maxAge: 60 * 60, // 1 hora
//   },
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.role = user.role;
//         token.expiresAt = user.tokenExpires;
//       }

//       // 🔹 Si el token expira, forzar cierre de sesión
//       if (Date.now() > token.expiresAt) {
//         console.warn("🔄 Token expirado. Cerrando sesión automáticamente.");
//         return null;
//       }

//       return token;
//     },
//     async session({ session, token }) {
//       if (!token) {
//         console.warn("❌ Token inválido. Cerrando sesión.");
//         return null;
//       }

//       session.user.role = token.role;
//       return session;
//     },
//   },
//   session: {
//     strategy: "jwt", // 🔹 Manejo de sesión con JWT en lugar de BD
//   },
//   secret: process.env.NEXTAUTH_SECRET, // 🔹 Clave secreta de NextAuth
// };

// const handler = NextAuth(authOptions);
// export { handler as GET, handler as POST };
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔍 Autenticando usuario:", credentials?.username);

        const usuario = await prisma.usuario.findUnique({
          where: { username: credentials.username },
          include: { rol: true },
        });
        if (!usuario) throw new Error("Usuario no encontrado.");

        const okHash = await bcrypt.compare(credentials.password, usuario.password);
        const okPlain = credentials.password === usuario.password; // por si aún no migras hashes
        if (!okHash && !okPlain) throw new Error("Contraseña incorrecta.");

        return {
          id: String(usuario.usuario_id),
          name: usuario.username,
          email: usuario.email || undefined,
          role: (usuario.rol && usuario.rol.nombre_rol) || "user",
          //tokenExpires: Date.now() + 60 * 60 * 1000, // 1h
        };
      },
    }),
  ],

  pages: { signIn: "/login" },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365 * 10,
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 365 * 10, // 1h
  },

  callbacks: {
    async jwt({ token, user }) {
      // Primer login: mezcla datos del usuario
      if (user) {
        token.role = user.role || "user";
        // token.expiresAt = typeof user.tokenExpires !== "undefined"
        //   ? Number(user.tokenExpires)
        //   : Date.now() + 60 * 60 * 1000; // fallback 1h
        // delete token.error;
      }

      // ⚠️ Nunca devuelvas null aquí; marca expiración con bandera
      /* if (token.expiresAt && Date.now() > Number(token.expiresAt)) {
        token.error = "TokenExpired";
      } */

      return token; // ✅ siempre un objeto
    },

    async session({ session, token }) {
      // Si el token está marcado como expirado, invalida la sesión
      // if (token && token.error === "TokenExpired") {
      //   return null; // aquí sí es válido devolver null
      // }

      if (session?.user) {
        session.user.role = (token && token.role) || "user";
      }
      // opcional: exponer el timestamp para tu hook
      //session.expiresAt = token ? token.expiresAt : null;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
