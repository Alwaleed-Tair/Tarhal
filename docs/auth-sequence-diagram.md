# Auth sequence diagram — Mohammed Alasad

Assignment: 10 October 2026. Reviewed against `main` at `b4e6d25` on 15 October 2026.
Prepared for Mohamed Elshiekh's combined UML document; delivery/acceptance is not claimed.

## Required register → login → session design (planned)

The README proposes NextAuth, but this repository has no registration endpoint, NextAuth dependency/configuration, session endpoint or protected dashboard implementation. The diagram below is a **design draft**, not a claim these steps are delivered. The week explicitly prohibits starting new features. Confirm this intended design with the architecture owner before implementing registration/sessions; the implemented login behavior is shown separately below.

```mermaid
sequenceDiagram
    autonumber
    actor User as Passenger
    participant UI as Auth UI (planned)
    participant Register as Registration handler (planned)
    participant DB as Prisma / PostgreSQL
    participant Auth as NextAuth service (planned)
    participant Dashboard as Protected dashboard (planned)
    Note over UI,Dashboard: Proposed end-to-end design - registration and sessions are not implemented
    User->>UI: Enter registration details
    UI->>Register: Submit name, email, phoneNumber, dateOfBirth, password
    Register->>Register: Validate fields and hash password
    alt Invalid fields
        Register-->>UI: Validation errors
    else Valid fields
        Register->>DB: Create user with server-controlled default role
        alt Email or phone already exists
            DB-->>Register: Unique constraint conflict
            Register-->>UI: Registration cannot be completed
        else Account created
            DB-->>Register: User ID
            Register-->>UI: Registration successful - sign in
            User->>UI: Enter login credentials
            UI->>Auth: Submit credentials
            Auth->>DB: Look up account
            DB-->>Auth: Account and password hash
            Auth->>Auth: Verify password
            alt Invalid credentials
                Auth-->>UI: Generic sign-in error
            else Valid credentials
                Auth-->>UI: Establish session using approved NextAuth configuration
                User->>Dashboard: Open dashboard
                Dashboard->>Auth: Validate session
                alt Valid session
                    Auth-->>Dashboard: Authenticated identity
                    Dashboard-->>User: Protected content
                else Missing or expired session
                    Dashboard-->>User: Return to sign-in
                end
            end
        end
    end
```

`dateOfBirth` is required by the current User model. Session storage/lifetime and frontend routes remain architecture decisions; this draft does not invent a session table or implemented route.

## Implemented login sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Passenger
    participant Client as API client
    participant API as POST /api/auth/login
    participant Password as Password helpers
    participant DB as Prisma / PostgreSQL
    User->>Client: Enter email or username and password
    Client->>API: JSON credentials
    API->>API: Validate JSON, identity and password
    alt Invalid input
        API-->>Client: 400 with code, error and optional field
    else Valid input
        API->>DB: Find at most two matching users
        alt Database unavailable
            API-->>Client: 500 LOGIN_UNAVAILABLE
        else Query succeeded
            DB-->>API: Matching accounts
            alt Missing account or ambiguous username
                API-->>Client: 401 INVALID_CREDENTIALS
            else One account
                API->>Password: Verify supplied password
                alt Wrong password
                    API-->>Client: 401 INVALID_CREDENTIALS
                else Correct password
                    opt Legacy plaintext account
                        API->>Password: Create salted scrypt password hash
                        API->>DB: Update only if stored password is unchanged
                        DB-->>API: Updated count or error
                    end
                    alt Credential update lost a race
                        API-->>Client: 401 CREDENTIALS_CHANGED
                    else Database write failed
                        API-->>Client: 500 LOGIN_UNAVAILABLE
                    else Ready
                        API-->>Client: 200 with user ID and name
                        Note over Client,API: No session or authentication cookie is created
                    end
                end
            end
        end
    end
```

## Existing recovery behavior

The client submits its email to `/api/auth/forgot-password`, which returns the same support instructions for known and unknown accounts. After identity verification an operator runs `scripts/issue-password-reset.ts` and privately delivers a 15-minute token. `/api/auth/reset-password` validates the token and new password and uses an atomic compare-and-set update; a successful update invalidates all tokens bound to the old password. The user then signs in again. No email is sent automatically. See [API handoff](auth-hotels-cars.md) for error codes and configuration.

Source trace: `app/api/auth/login/route.ts`, `lib/auth-http.ts`, `lib/passwords.ts`, `lib/password-reset.ts`, `prisma/schema.prisma`. No registration or session functionality was added to make the diagram appear implemented.
