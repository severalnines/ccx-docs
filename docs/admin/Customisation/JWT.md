# JWT Authentication
This section describes how to implement JWT Authentication. The JWT Authentication allows integrating a Service Portal with CCX.
![img](../images/JWT.png)
### Users and Sessions Managed Using JWTs
The picture below shows the authentication flow:

![img](../images/JWTFLOW.png)

A **JWT** contains an associative array with claims about the user and session, and is signed by the issuer with a private key (RSA).

- The `jti` claim is a UUID identifying the session.
- The `sub` claim uniquely identifies the user. It can be a project id, an org id, a user id, an email address, or any other string that uniquely identifies your end-user.

**CCX** verifies JWTs using the corresponding public key (RSA), which is stored in the values file.

The private key is used by **CSP** to encrypt the JWT token (see [examples](#examples-of-jwt-generation)). A key pair can be generated with:

```bash
ssh-keygen -t rsa -b 4096 -m PEM -f ccx.key
ssh-keygen -e -f ccx.key -m PEM > ccx.key.pub
```

#### Public key configuration in CCX Helm values:
you need to set the configuration parameters in `ccx.services.auth` in ccx values.yaml
```
      env:
        JWT_PUBLIC_KEY_ID: 'EXAMPLE_CSP'
        JWT_PUBLIC_KEY_PEM: |-
            -----BEGIN PUBLIC KEY-----
            MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxowkw7Zf2pXoehn2CkwQ
            sHqbASdRp2DENgUEIGj+iqQPMDZor2CD1fVYpVZW+kcQkR9SgIvb+QiSgdHvWegs
            -----END PUBLIC KEY-----
```

#### JWT Environment Variables

| Environment Variable     | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **JWT_PUBLIC_KEY_ID**    | The identifier of the provider, e.g., "EXAMPLE_CSP".      |
| **JWT_PUBLIC_KEY_PEM**   | The public key in PEM format (contents of `ccx.key.pub`). |
| **JWT_PUBLIC_KEY_PKIX**  | Should be "1" if the key is in PKIX format (optional).    |

---

### JWT Endpoints

There are four endpoints for handling JWTs, all prefixed with `/api/auth`:

#### `POST /jwt-login`
- **Description**: A new session is created. If the user doesn’t exist in the CCX database, a new user is created.
- **Response**: Returns `200 OK` on success.
  
**Request (JSON):**

```json
{
  "issuer": "CSPNAME",
  "jwt": "JWT_TOKEN",
  "first_name": "First Name (Optional)",
  "last_name": "Last Name (Optional)"
}
```

**Response (JSON):**

```json
{
  "user": "User Info"
}
```

#### `GET /jwt-login`
- **Description**: Creates a session for the provided user. The user must exist in the CCX database.
- **Response**: Returns `303 See other` on success. Redirects the user to the URL provided in the `LOGIN_REDIRECT_URL` environment variable in `ccx-auth-service`.

**Query Parameters:**
- `issuer` — the issuer of the JWT, e.g., "CSPNAME".
- `jwt` — the JWT.

#### `POST /jwt-logout`
- **Description**: Logs out the user. The associated session is deleted.
- **Response**: Returns `204 No content` on success.

**Request (JSON):**

```json
{
  "issuer": "CSPNAME",
  "jwt": "JWT_TOKEN"
}
```

#### `POST /jwt-check`
- **Description**: Verifies the provided JWT. Returns its claims and the issuance and expiration dates.
- **Response**: Returns `200 OK` on success.

**Request (JSON):**

```json
{
  "issuer": "CSPNAME",
  "jwt": "JWT_TOKEN"
}
```

**Response (JSON):**

```json
{
  "claims": "...",
  "issued_at": "...",
  "expires_at": "..."
}
```

---

### Examples of JWT Generation
Run the code by setting the params such as my.ccx.url, Example_CSP, UserID and Private Key
#### **Go Example:**

```go
package main

import (
    "bytes"
    "crypto/rsa"
    "crypto/x509"
    "encoding/json"
    "encoding/pem"
    "errors"
    "log"
    "net/http"
    "time"
    "github.com/golang-jwt/jwt"
    "github.com/google/uuid"
)

const authUrlPrefix = "https://<my.ccx.url>/api/auth"

var (
    ErrBadPEMData = errors.New("malformed PEM data")
)

type jwtLoginRequest struct {
    Issuer    string `json:"issuer"`
    Token     string `json:"jwt"`
    FirstName string `json:"first_name"`
    LastName  string `json:"last_name"`
}

func privateRSAKeyFromPEM(b []byte) (*rsa.PrivateKey, error) {
    block, _ := pem.Decode(b)
    if block == nil {
        return nil, ErrBadPEMData
    }
    return x509.ParsePKCS1PrivateKey(block.Bytes)
}

func createJWT(issuer, subject string, exp time.Duration, key *rsa.PrivateKey) (string, error) {
    now := time.Now()
    claims := jwt.MapClaims{
        "iss": issuer,
        "sub": subject,
        "jti": uuid.NewString(),
        "iat": now.Unix(),
        "exp": now.Add(exp).Unix(),
    }
    return jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(key)
}

func main() {
    privKey, err := privateRSAKeyFromPEM(privateKey)
    if err != nil {
        log.Fatal(err)
    }

    token, err := createJWT("EXAMPLE_CSP", "userID", 15*time.Minute, privKey)
    if err != nil {
        log.Fatal(err)
    }

    client := &http.Client{Timeout: 5 * time.Second}
    in := &jwtLoginRequest{
        Issuer:    "EXAMPLE_CSP",
        Token:     token,
        FirstName: "First_Name",
        LastName:  "Last_Name",
    }
    var buf bytes.Buffer
    if err := json.NewEncoder(&buf).Encode(in); err != nil {
        log.Fatal(err)
    }
    req, err := http.NewRequest(http.MethodPost, authUrlPrefix+"/jwt-login", &buf)
    if err != nil {
        log.Fatal(err)
    }
    resp, err := client.Do(req)
    if err != nil {
        log.Fatal(err)
    }
    defer resp.Body.Close()
    log.Print("response status: ", resp.Status)
	constructedURL := fmt.Sprintf("%s/jwt-login?jwt=%s&issuer=%s", authUrlPrefix, token, "EXAMPLE_CSP")
	log.Printf("Constructed URL: %s", constructedURL) // Log the constructed URL
}

var (
    privateKey = []byte(`-----BEGIN RSA PRIVATE KEY-----
xxx
-----END RSA PRIVATE KEY-----`)
)
```

#### **JavaScript (Node.js) Example:**

```javascript
const jwt = require("jsonwebtoken");
const fs = require("fs");
const url = require("url");

const privateKey = fs.readFileSync("./ccx.key");

function createJwt(issuer, subject, exp, key) {
    const iat = Math.floor(Date.now() / 1000);

    return jwt.sign({
        iss: issuer,
        sub: subject,
        jti: Math.random().toString(36).substring(7),
        iat: iat,
        exp: iat + (exp * 60),
    }, key, { algorithm: "RS256" });
}

function example() {
    const token = createJwt("<mycloud>", "<my-customer-id>", 15 * 60, privateKey);
    const r = new url.URL('https://<my.ccx.url>/api/auth/jwt-login');
    r.searchParams.set("jwt", token);
    r.searchParams.set("issuer", "<mycloud>");
    console.log(r.href); // you can redirect the user to this URL
}

example();
