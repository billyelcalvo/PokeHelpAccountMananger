# PokeAccountHelpMananger

API local para organizar cuentas de Pokémon GO y registrar los Pokémon de cada cuenta, con tipos definidos por el usuario e IV opcionales. Implementada con Express, TypeScript, Zod, Prisma y PostgreSQL.

## Instalación

Requisitos: Node.js 24 LTS, npm y una base PostgreSQL disponible.

```bash
npm ci
cp .env.template .env
```

Completa `DATABASE_URL` en `.env` con la conexión a tu base de datos. Luego, para una base nueva:

```bash
npm run db:deploy
npm run db:generate
npm run dev
```

El servidor escucha en `http://127.0.0.1:3000`. `HOST` y `PORT` son opcionales. `GET /health` permite comprobar que el servidor responde.

Si ya creaste las tablas con el esquema original usando `prisma db push`, y esas tablas coinciden con la migración inicial, registra esa migración como aplicada antes de ejecutar `npm run db:deploy`:

```bash
npx prisma migrate resolve --applied 20260914000000_initial
npm run db:deploy
npm run db:generate
```

La segunda migración permite IV nulos y copia los IV que antes compartían varios Pokémon para que cada uno pueda editarlos independientemente. No elimina las cuentas ni los Pokémon existentes. Los comandos usan `prisma7.config.ts`, que apunta a las migraciones de este repositorio.

Para compilar y ejecutar:

```bash
npm run build
npm start
```

## Flujo de uso

1. Crea una cuenta con nombre, correo y contraseña.
2. Crea un tipo personalizado, como `Eléctrico`. El icono es opcional.
3. Registra un Pokémon en la cuenta indicando el ID del tipo.
4. Agrega o modifica los IV cuando tengas esos datos.

Los IDs de los ejemplos son ilustrativos: utiliza los que devuelva la API.

```bash
curl -X POST http://127.0.0.1:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"name":"Cuenta principal","email":"entrenador@example.com","password":"clave-de-ejemplo"}'

curl -X POST http://127.0.0.1:3000/types \
  -H 'Content-Type: application/json' \
  -d '{"type":"Eléctrico"}'

curl -X POST http://127.0.0.1:3000/accounts/1/pokemons \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pikachu","typeId":1}'

curl -X PATCH http://127.0.0.1:3000/accounts/1/pokemons/1 \
  -H 'Content-Type: application/json' \
  -d '{"iv":{"attack":15,"defense":14,"hp":13}}'

curl http://127.0.0.1:3000/accounts/1/pokemons
```

## Rutas

| Método | Ruta | Acción |
| --- | --- | --- |
| GET, POST | `/accounts` | Listar o crear cuentas |
| GET, PATCH, DELETE | `/accounts/:accountId` | Consultar, editar o eliminar una cuenta |
| GET, POST | `/types` | Listar o crear tipos personalizados |
| GET, PATCH, DELETE | `/types/:typeId` | Consultar, editar o eliminar un tipo |
| GET, POST | `/accounts/:accountId/pokemons` | Listar o crear Pokémon de una cuenta |
| GET, PATCH, DELETE | `/accounts/:accountId/pokemons/:pokemonId` | Consultar, editar o eliminar un Pokémon de esa cuenta |

Consultar una cuenta incluye sus Pokémon. Los Pokémon incluyen su tipo y sus IV, o `iv: null` si todavía no están registrados. El nombre de un Pokémon puede repetirse en una misma cuenta.

Al crear un Pokémon, `name` y `typeId` son obligatorios. `accountId` se toma de la URL. En `PATCH` puedes enviar `name`, `typeId` o `iv`, según lo que quieras modificar:

- Si omites `iv`, conserva los valores actuales.
- Si envías `iv: null`, elimina los IV registrados.
- Si envías un objeto `iv`, incluye `attack`, `defense` y `hp`, cada uno como entero entre 0 y 15. Crea o reemplaza esos valores.

Los tipos aceptan `type` y un `icon` opcional como URL. Puedes eliminar el icono con `icon: null`. Cada Pokémon tiene un tipo, siguiendo el modelo original.

Eliminar un Pokémon elimina también sus IV. Eliminar una cuenta elimina sus Pokémon y sus IV dentro de una transacción. Los tipos se conservan y no se pueden eliminar mientras algún Pokémon los utilice.

Las respuestas de creación usan `201` y un encabezado `Location`; las eliminaciones usan `204`. Las entradas inválidas devuelven `400`, los recursos inexistentes o Pokémon que no pertenecen a la cuenta indicada devuelven `404`, y los conflictos de referencias devuelven `409`. Los campos desconocidos y las actualizaciones vacías se rechazan.

## Pruebas

```bash
npm run db:validate
npm run typecheck
npm test
```

Las pruebas de integración envían solicitudes HTTP a un servidor temporal y usan una base PostgreSQL de pruebas. Primero aplica las migraciones a esa base:

```bash
DATABASE_URL='postgresql://user:password@localhost:5432/pokeaccount_test' npm run db:deploy
TEST_DATABASE_URL='postgresql://user:password@localhost:5432/pokeaccount_test' npm run test:integration
```

Cubren registro sin IV, edición posterior, comprobación de la cuenta en cada ruta, validación, tipos personalizados y limpieza de relaciones. Crean sus propios datos y los eliminan al terminar. `TEST_DATABASE_URL` es obligatorio y no se toma de `.env`.

## Alcance actual

El proyecto expone una API; todavía no tiene interfaz gráfica ni autenticación de usuarios. Se enlaza a `127.0.0.1` por defecto para uso local. La cuenta de la URL selecciona los datos y no constituye un permiso de acceso.

El campo `password` conserva el almacenamiento en texto del modelo original y no se devuelve en las respuestas HTTP. Esta versión no ofrece un almacén cifrado de credenciales.
