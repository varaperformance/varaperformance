# Authentication System

The web application uses a React Context-based authentication system that manages user state, profile data, and role-based access control (RBAC).

## Overview

The auth system consists of three main parts:

1. **AuthProvider** - React context provider that wraps the app
2. **useAuth hook** - Access auth state from any component
3. **ProtectedRoute** - Route-level access control

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      AuthProvider                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   useMe()   │  │ useProfile()│  │  Auth Context   │  │
│  │  (JWT data) │  │ (user data) │  │   (combined)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    ProtectedRoute                        │
│  • Authentication check                                  │
│  • Consent verification                                  │
│  • Profile completion redirect                           │
│  • Role/Permission gating                                │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Your Components                       │
│  const { user, hasPermission } = useAuth();             │
└─────────────────────────────────────────────────────────┘
```

## AuthProvider

The `AuthProvider` component wraps the entire application and provides:

### State

| Property            | Type                 | Description                                           |
| ------------------- | -------------------- | ----------------------------------------------------- |
| `user`              | `JwtPayload \| null` | Current user from JWT (id, email, roles, permissions) |
| `profile`           | `Profile \| null`    | User's profile data (displayName, bio, avatar, etc.)  |
| `isLoading`         | `boolean`            | True while fetching user/profile data                 |
| `isAuthenticated`   | `boolean`            | True if user is logged in                             |
| `isProfileComplete` | `boolean`            | True if profile has `completedAt` set                 |

### Methods

| Method              | Signature                            | Description                                            |
| ------------------- | ------------------------------------ | ------------------------------------------------------ |
| `hasRole`           | `(role: string) => boolean`          | Check if user has a specific role                      |
| `hasAnyRole`        | `(roles: string[]) => boolean`       | Check if user has any of the roles                     |
| `hasPermission`     | `(permission: string) => boolean`    | Check if user has a permission (with wildcard support) |
| `hasAllPermissions` | `(permissions: string[]) => boolean` | Check if user has all permissions                      |
| `logout`            | `() => Promise<void>`                | Log out and redirect to login                          |
| `refresh`           | `() => void`                         | Re-fetch user and profile data                         |

## Usage

### Basic Usage

```tsx
import { useAuth } from "@/hooks/use-auth";

function MyComponent() {
  const { user, profile, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <p>Welcome, {profile?.displayName}</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
```

### Role-Based UI

```tsx
function AdminPanel() {
  const { hasRole } = useAuth();

  if (!hasRole("ADMIN")) {
    return <p>Access denied</p>;
  }

  return <AdminDashboard />;
}
```

### Permission-Based UI

```tsx
function BlogActions() {
  const { hasPermission } = useAuth();

  return (
    <div>
      {hasPermission("blog:create") && <Button>New Post</Button>}
      {hasPermission("blog:delete") && (
        <Button variant="destructive">Delete</Button>
      )}
    </div>
  );
}
```

## Permission Wildcards

The permission system supports wildcards for flexible access control:

| User's Permission | Required Permission | Match? | Description                              |
| ----------------- | ------------------- | ------ | ---------------------------------------- |
| `blog:create`     | `blog:create`       | ✅     | Exact match                              |
| `*:*`             | anything            | ✅     | Superadmin - full access                 |
| `blog:*`          | `blog:create`       | ✅     | Resource wildcard - all blog actions     |
| `blog:*`          | `blog:delete`       | ✅     | Resource wildcard - all blog actions     |
| `*:create`        | `blog:create`       | ✅     | Action wildcard - create on any resource |
| `*:create`        | `user:create`       | ✅     | Action wildcard - create on any resource |
| `blog:create`     | `blog:delete`       | ❌     | No match                                 |

### Example Permission Sets

```text
# Content Editor
blog:create, blog:update, blog:delete

# Blog Admin (using wildcard)
blog:*

# Creator Role (can create anything)
*:create

# Super Admin
*:*
```

## Protected Routes

Use `ProtectedRoute` to gate routes by role or permission:

### Authentication Only

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

### Require Role

```tsx
<Route element={<ProtectedRoute requiredRole="ADMIN" />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>;

{
  /* Multiple roles (OR logic) */
}
<Route element={<ProtectedRoute requiredRole={["ADMIN", "MODERATOR"]} />}>
  <Route path="/moderate" element={<ModeratePage />} />
</Route>;
```

### Require Permission

```tsx
<Route element={<ProtectedRoute requiredPermission="blog:create" />}>
  <Route path="/blog/new" element={<BlogEditor />} />
</Route>;

{
  /* Multiple permissions (AND logic) */
}
<Route
  element={
    <ProtectedRoute requiredPermission={["blog:create", "blog:publish"]} />
  }
>
  <Route path="/blog/publish" element={<PublishPage />} />
</Route>;
```

## Helper Hooks

### useRequireRole

Redirects if user doesn't have the required role:

```tsx
function AdminPage() {
  const { isAuthorized, isLoading } = useRequireRole("ADMIN");

  if (isLoading) return <Spinner />;
  if (!isAuthorized) return null; // Already redirecting

  return <AdminContent />;
}
```

### useRequirePermission

Redirects if user doesn't have the required permission:

```tsx
function BlogEditor() {
  const { isAuthorized, isLoading } = useRequirePermission("blog:create");

  if (isLoading) return <Spinner />;
  if (!isAuthorized) return null;

  return <Editor />;
}
```

## Public Routes

The following routes are accessible without authentication or profile completion:

- `/` - Home
- `/login`, `/register`, `/verification` - Auth pages
- `/blog`, `/shop`, `/pricing` - Public content
- `/terms`, `/privacy`, `/security` - Legal pages
- `/status`, `/roadmap`, `/release-notes` - Status pages
- And more...

## Profile Completion Flow

When a user is authenticated but hasn't completed their profile:

1. AuthProvider checks `profile.completedAt`
2. If null and user is on a protected route, redirect to `/profile/create`
3. Profile-exempt routes (`/login`, `/profile/create`, etc.) skip this check

## Files

| File                                        | Purpose                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `src/components/auth-provider.tsx`          | Main AuthProvider component                         |
| `src/lib/auth-context.ts`                   | Context definition and types                        |
| `src/hooks/use-auth.ts`                     | useAuth, useRequireRole, useRequirePermission hooks |
| `src/components/common/protected-route.tsx` | Route protection component                          |
