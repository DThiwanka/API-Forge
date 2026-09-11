# API Forge Backend

Backend foundation service for API Forge.

## Technology Stack
- Node.js (ES Modules)
- Express
- Prisma (MySQL)
- REST API

## Environment Configuration
Configure environment variables in `.env` (refer to `.env.example`):
- `PORT`: Server port (default `5000`)
- `NODE_ENV`: Runtime environment (`development` / `production`)
- `DATABASE_URL`: MySQL connection URI (`mysql://USER:PASSWORD@localhost:3306/apiforge`)
- `CLIENT_URL`: Allowed frontend origin (`http://localhost:5173`)
- `JWT_ACCESS_SECRET`: Secret key for signing short-lived access tokens
- `JWT_REFRESH_SECRET`: Secret key for signing long-lived refresh tokens
- `JWT_ACCESS_EXPIRES_IN`: Access token expiration (default `15m`)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default `7d`)

## Database Setup (MySQL)
APIForge requires a running MySQL database instance (version 8.0+ recommended).

1. Ensure MySQL is running on your host machine (default port `3306`).
2. Create the database:
```sql
CREATE DATABASE IF NOT EXISTS apiforge;
```
3. Set your connection string in `apiforge_backend/.env`:
```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/apiforge"
```

## Database Scripts
## Database & Test Scripts
- **Run Tests**: `npm test` - Executes unit and integration test suites using Node's native test runner.
- **Generate Client**: `npm run prisma:generate` - Generates Prisma Client based on `prisma/schema.prisma`.
- **Database Seed**: `npm run prisma:seed` - Verifies database connectivity.
- **Run Migrations**: `npm run prisma:migrate` - Applies migrations to the database.
- **Prisma Studio**: `npm run prisma:studio` - Starts Prisma visual database browser.

## Getting Started
```bash
npm install
npm run prisma:generate
npm run prisma:seed
npm run prisma:migrate
npm test
npm run dev
```

## Health Endpoint
`GET /api/health` returns status and server uptime.
## API Endpoints

### Health
- `GET /api/health` - Server health and uptime.

### Authentication
- `POST /api/auth/register` - Register a new user (`email`, `password`, `name`). Sets access and refresh cookies, returns user data and tokens.
- `POST /api/auth/login` - Authenticate user credentials (`email`, `password`). Sets access and refresh cookies.
- `GET /api/auth/me` - Authenticated user profile. Requires HTTP-only access token cookie or `Authorization: Bearer <token>`.
- `POST /api/auth/refresh` - Issue new tokens using HTTP-only refresh cookie or `refreshToken` body.
- `POST /api/auth/logout` - Invalidate session and clear authentication cookies.

### Workspaces
All workspace endpoints require an authenticated user.
- `POST /api/workspaces` - Create a new workspace (`name`, `description`). The creator is automatically and atomically assigned the `OWNER` role.
- `GET /api/workspaces` - List all workspaces where the authenticated user is a member, including their membership role.
- `GET /api/workspaces/:workspaceId` - Retrieve details of a specific workspace. Access is restricted to workspace members.
- `PATCH /api/workspaces/:workspaceId` - Update workspace metadata (`name`, `description`). Requires `ADMIN` role or higher.
- `DELETE /api/workspaces/:workspaceId` - Delete a workspace. Strictly restricted to `OWNER`. Cascade deletes all associated workspace memberships.

### Workspace Role Hierarchy
Roles follow a strict hierarchy: `OWNER > ADMIN > MEMBER > VIEWER`.
- **OWNER**: Full administrative control, can update metadata, and solely authorized to delete the workspace.
- **ADMIN**: Can update workspace metadata and manage future resources.
- **MEMBER**: Standard operational access for working with workspace resources.
- **VIEWER**: Read-only access to workspace resources.

### Collections
Collections organize API requests and folders within a workspace.
- `POST /api/workspaces/:workspaceId/collections` - Create collection (`name`, `description`). Auto-assigns position. Requires `MEMBER`+.
- `GET /api/workspaces/:workspaceId/collections` - List all collections for workspace ordered by position. Requires `VIEWER`+.
- `GET /api/workspaces/:workspaceId/collections/:collectionId` - Retrieve single collection. Requires `VIEWER`+.
- `PATCH /api/workspaces/:workspaceId/collections/:collectionId` - Update collection (`name`, `description`). Requires `MEMBER`+.
- `DELETE /api/workspaces/:workspaceId/collections/:collectionId` - Delete collection. Cascade deletes all child folders. Requires `ADMIN`+.

### Folders
Folders group requests within a collection and support infinite nesting.
- `POST /api/workspaces/:workspaceId/collections/:collectionId/folders` - Create folder (`name`, optional `parentId`). Requires `MEMBER`+.
- `GET /api/workspaces/:workspaceId/collections/:collectionId/folders` - List folders (flat by default, or as a nested hierarchy tree using `?tree=true`). Requires `VIEWER`+.
- `GET /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId` - Retrieve folder details. Requires `VIEWER`+.
- `PATCH /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId` - Update folder (`name`, `parentId`). Validates tree integrity and prevents circular parent relationships. Requires `MEMBER`+.
- `DELETE /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId` - Delete folder and cascade delete all subfolders. Requires `ADMIN`+.

### API Request Definitions
Requests are stored API configurations organized inside a collection and optionally within a folder.
*Note: This layer manages stored definitions only. HTTP request execution is not implemented yet.*

#### Endpoints
- `POST /api/workspaces/:workspaceId/collections/:collectionId/requests` - Create request definition. Requires `MEMBER`+.
- `GET /api/workspaces/:workspaceId/collections/:collectionId/requests` - List requests for collection (supports `?folderId=<id>` filter). Requires `VIEWER`+.
- `GET /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId` - Retrieve single request definition. Requires `VIEWER`+.
- `PATCH /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId` - Update request metadata, headers, params, body, auth, or move to folder. Requires `MEMBER`+.
- `DELETE /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId` - Delete request definition. Requires `MEMBER`+.
- `POST /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId/duplicate` - Clone request definition with new ID and `Copy` suffix. Requires `MEMBER`+.

#### Request Configuration Specifications
- **HTTP Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
- **Query Parameters & Headers**: Array of `{ key, value, enabled, description }`.
- **Authentication Types**: `none`, `bearer`, `basic`, `api-key`.
- **Body Modes**: `none`, `json`, `text`, `form-data`, `x-www-form-urlencoded`, `raw`.
- **Deletion Behaviors**:
  - Deleting a folder moves requests contained within it to the collection root (`folderId: null`).
  - Deleting a collection cascades and removes all contained requests.
- **Security Notice**: Authentication credentials (tokens, keys, passwords) are stored as configuration payloads for API requests and are not logged.

### Request Execution Engine
The backend API request execution engine executes stored request definitions through an isolated, bounded, and SSRF-safe pipeline. Responses are normalized and returned immediately to the client without mutating saved requests or persisting execution history.

#### Endpoint
- `POST /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId/execute` - Execute request definition. Requires `MEMBER`+ role.
  - Body (optional):
    ```json
    {
      "variables": {
        "baseUrl": "https://api.example.com",
        "token": "secret123"
      }
    }
    ```

#### Execution Pipeline
```text
Stored Request
      ↓
Verify Tenant & Permissions (MEMBER+)
      ↓
Resolve Runtime Variables ({{variable}})
      ↓
Transform Headers, Query Params, Auth & Body
      ↓
Validate Destination & SSRF Protection
      ↓
Execute Bounded HTTP Request (Timeout & Size Guard)
      ↓
Normalize Response Payload
      ↓
Return Response to Caller (Zero Persistence)
```

#### Security & Safeguards
- **SSRF Protection**: Strictly blocks `localhost`, `127.0.0.0/8`, private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local and cloud metadata addresses (`169.254.169.254`, `100.100.100.200`), multicast/reserved ranges, and non-HTTP protocols (`file://`, `ftp://`).
- **Redirect Re-validation**: Up to 5 manual redirects. Every destination URL is re-validated against SSRF rules before following the next hop.
- **Variable Substitution**: Non-executable string replacement without code evaluation. Missing referenced variables fail immediately with a 400 validation error.
- **Resource Bounds**: Request timeouts are clamped between 100ms and 120,000ms. Response payloads are bounded by a streaming 10 MB limit to prevent memory exhaustion attacks.
- **Target Status Isolation**: Remote 4xx and 5xx responses from external APIs are treated as valid HTTP responses and normalized rather than crashing APIForge.
- **Zero Credential Logging**: Authorization headers, basic auth secrets, and API keys are scrubbed from console and logging output.

### Environments & Variable Management
APIForge supports workspace-scoped environments and dedicated variable models. Environments store reusable values (`baseUrl`, `apiKey`, `token`, `username`, `password`) that are dynamically consumed during request execution.

#### Environment Endpoints
- `POST /api/workspaces/:workspaceId/environments` - Create an environment (`name`, `description`). Name must be unique within workspace. Requires `ADMIN`+ role.
- `GET /api/workspaces/:workspaceId/environments` - List all environments for workspace with variable counts. Requires `VIEWER`+ role.
- `GET /api/workspaces/:workspaceId/environments/:environmentId` - Get environment details with its variables. Requires `VIEWER`+ role.
- `PATCH /api/workspaces/:workspaceId/environments/:environmentId` - Update environment metadata (`name`, `description`). Requires `ADMIN`+ role.
- `DELETE /api/workspaces/:workspaceId/environments/:environmentId` - Delete environment (cascades to all variables). Requires `ADMIN`+ role.
- `POST /api/workspaces/:workspaceId/environments/:environmentId/activate` - Activate an environment. Atomically deactivates all other environments in the workspace. Requires `ADMIN`+ role.

#### Variable Endpoints
- `POST /api/workspaces/:workspaceId/environments/:environmentId/variables` - Create variable (`key`, `value`, `isSecret`). Requires `ADMIN`+ role.
  - `key`: Must match format `/^[A-Za-z_][A-Za-z0-9_]*$/` (e.g. `baseUrl`, `apiKey`, `client_id`). Must be unique within environment.
- `GET /api/workspaces/:workspaceId/environments/:environmentId/variables` - List variables for environment. Secret values masked as `••••••••`. Requires `VIEWER`+ role.
- `GET /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId` - Get single variable. Secret values masked. Requires `VIEWER`+ role.
- `PATCH /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId` - Update variable (`key`, `value`, `isSecret`). Requires `ADMIN`+ role.
- `DELETE /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId` - Delete variable. Requires `ADMIN`+ role.

#### Active Environment & Execution Integration
- **Single Active Environment**: Each workspace can have at most one active environment at a time.
- **Precedence Hierarchy**:
  ```text
  Runtime Variables (POST body) > Active Environment Variables
  ```
  Runtime variables supplied during request execution override active environment variables with the same key.
- **Graceful Fallback**: If no environment is active in the workspace, request execution falls back smoothly to runtime variables without errors.
- **Secret Masking & Security**: Variables marked `isSecret: true` have their values masked (`••••••••`) across all API responses. Unmasked secrets are provided internally only to the outbound HTTP client and are never logged or echoed in execution responses.

### API Request Execution History
Every request execution creates a safe, isolated, workspace-scoped history record tracking execution metadata (method, URL, status code, timing, response size, success/failure classification) while strictly omitting request/response bodies and sensitive authentication credentials.

#### Endpoints
- `GET /api/workspaces/:workspaceId/history` - List execution history records with pagination and filters (`page`, `limit`, `requestId`, `method`, `status`, `search`). Requires `VIEWER`+ role.
- `GET /api/workspaces/:workspaceId/history/:historyId` - Get details of a single execution record. Requires `VIEWER`+ role.
- `DELETE /api/workspaces/:workspaceId/history/:historyId` - Delete a single execution record. Requires `MEMBER`+ role.
- `DELETE /api/workspaces/:workspaceId/history` - Clear execution history for the workspace (or optionally filtered by `?requestId=<id>`). Requires `ADMIN`+ role.

#### Metadata & Sanitization Safeguards
- **Zero Body Persistence**: Request and response bodies are never persisted in history records.
- **Credential & Secret Stripping**: Authorization headers, Bearer tokens, Basic auth passwords, cookies, and secret environment variables are never persisted.
- **URL Masking**: URLs containing passwords or active environment secret values have those sensitive values masked as `••••••••`.
- **Failure Classification**: Distinguishes between target HTTP responses (200-599, with `success: true` for 2xx/3xx, `false` for 4xx/5xx) and transport failures (`TIMEOUT`, `SECURITY`, `NETWORK`, `VALIDATION`, `UNKNOWN`).

### API Testing & Assertions
Enables users to define declarative assertions on API requests and evaluate them against real HTTP responses produced by the execution engine.

#### Endpoints
- `POST /api/workspaces/:workspaceId/requests/:requestId/tests` - Create a test definition (`name`, `description`, `enabled`). Requires `MEMBER`+ role.
- `GET /api/workspaces/:workspaceId/requests/:requestId/tests` - List all tests for a request. Requires `VIEWER`+ role.
- `GET /api/workspaces/:workspaceId/requests/:requestId/tests/:testId` - Get a test definition with its assertions. Requires `VIEWER`+ role.
- `PATCH /api/workspaces/:workspaceId/requests/:requestId/tests/:testId` - Update test definition (`name`, `description`, `enabled`). Requires `MEMBER`+ role.
- `DELETE /api/workspaces/:workspaceId/requests/:requestId/tests/:testId` - Delete test definition (cascades to assertions). Requires `MEMBER`+ role.
- `POST /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/run` - Execute request definition and evaluate all assertions. Requires `MEMBER`+ role.
- `POST /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions` - Add assertion to test (`type`, `operator`, `path`, `expectedValue`, `position`). Requires `MEMBER`+ role.
- `PATCH /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions/:assertionId` - Update an assertion definition. Requires `MEMBER`+ role.
- `DELETE /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions/:assertionId` - Delete an assertion definition. Requires `MEMBER`+ role.

#### Assertion Types & Operators
- **`status`**: HTTP status code. Operators: `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`.
- **`response_time`**: Request duration in milliseconds. Operators: `equals`, `not_equals`, `less_than`, `less_than_or_equal`, `greater_than`, `greater_than_or_equal`.
- **`json_path`**: Safe evaluation of JSON property paths (`data.user.id`, `items[0].name`, `items.length`). Operators: `equals`, `not_equals`, `contains`, `not_contains`, `exists`, `not_exists`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`.
- **`header`**: Header value inspection (case-insensitive). Operators: `equals`, `not_equals`, `contains`, `not_contains`, `exists`, `not_exists`.
- **`body_contains`**: Raw or serialized body content inspection. Operators: `contains`, `not_contains`, `exists`, `not_exists`.

#### Security & Architecture
- **Zero Dynamic Code Execution**: Path resolution and assertion comparisons use strictly deterministic tokenization without `eval`, `new Function`, or arbitrary script engines. Prototype pollution attempts (`__proto__`, `constructor`, `prototype`) are safely rejected.
- **Execution Pipeline Reuse**: Reuses the core execution pipeline (`requestExecutionService`), preserving SSRF checks, timeout bounds, and history recording.
- **Graceful Failure Classification**: Transport and infrastructure failures (timeouts, SSRF, network errors) return structured test failure results rather than unhandled 500 errors.

### cURL Import & Export
APIForge supports importing API request definitions from cURL commands and exporting saved requests back into clean, portable cURL syntax.

#### Endpoints
- `POST /api/workspaces/:workspaceId/import/curl/preview` - Parse and preview a cURL command into a normalized APIForge request structure without persisting anything to the database. Requires `VIEWER`+ role.
  - Body:
    ```json
    {
      "curl": "curl -X POST https://api.example.com/items -H 'Content-Type: application/json' -d '{\"name\":\"widget\"}'"
    }
    ```
- `POST /api/workspaces/:workspaceId/import/curl` - Parse a cURL command and persist it as a new API request under a specified collection and optional folder. Requires `MEMBER`+ role.
  - Body:
    ```json
    {
      "curl": "curl -X POST https://api.example.com/items -H 'Authorization: Bearer token123'",
      "collectionId": "col_uuid",
      "folderId": "folder_uuid",
      "name": "Create Item"
    }
    ```
- `GET /api/workspaces/:workspaceId/requests/:requestId/export/curl` - Export an existing API request definition as a formatted, POSIX-escaped cURL command. Requires `VIEWER`+ role.
  - Response:
    ```json
    {
      "curl": "curl -X POST \\\n  'https://api.example.com/items' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\":\"widget\"}'",
      "hasSecrets": false
    }
    ```

#### Supported cURL Options
- **Methods**: `-X`, `--request` (e.g. `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).
- **Headers**: `-H`, `--header` (e.g. `-H 'Content-Type: application/json'`). Automatically separates `Authorization: Bearer <token>` into structured bearer auth.
- **Data / Bodies**:
  - `-d`, `--data`, `--data-raw`, `--data-ascii`: Parsed as JSON, text, or form-urlencoded with appropriate `body.mode`.
  - `--data-binary`: Parsed raw body.
  - `--data-urlencode`: URL-encoded key-value pairs or raw segments.
- **Query Parameters**: Extracted cleanly from the URL into structured `queryParams` array, preventing parameter duplication during execution.
- **GET Data Conversion**: `-G`, `--get` automatically moves `-d` data into query parameters.
- **Authentication**:
  - `-u`, `--user user:pass` or `-u user` mapped to structured `basic` auth.
  - `Authorization: Bearer <token>` mapped to structured `bearer` auth.
  - API keys mapped to header authentication.
- **Other Flags**:
  - `-b`, `--cookie`: Parsed as `Cookie` header.
  - `-A`, `--user-agent`: Parsed as `User-Agent` header.
  - `-e`, `--referer`: Parsed as `Referer` header.
  - `-m`, `--max-time`: Configured in request `settings.timeoutMs`.
  - `-L`, `--location`: Configured in request `settings.followRedirects`.

#### Security & Architecture
- **Zero Dynamic Shell Execution**: The cURL tokenizer (`curl-tokenizer.js`) and import service parse command strings using strict POSIX token grammar. No shell processes (`exec`, `spawn`, `sh`, `bash`, `cmd`) or eval engines are ever executed.
- **Zero Credential Logging**: Authorization tokens, basic auth passwords, cookies, and secret keys in imported or exported commands are never logged to console or application logs.
- **POSIX Shell Escaping**: Exported cURL commands use standard POSIX single-quote escaping (`'\''`) to guarantee cross-shell portability and prevent unintended terminal variable expansion or command injection.
- **Input Bounds**: Imported cURL commands are bounded to a maximum of 100,000 characters to prevent denial-of-service attempts.


