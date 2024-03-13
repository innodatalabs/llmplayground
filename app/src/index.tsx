import { Auth0Provider, withAuthenticationRequired } from "@auth0/auth0-react"
import React from "react"
import { createRoot } from "react-dom/client"
import App from "./app"

const ProtectedApp = withAuthenticationRequired(App);

const container = document.getElementById("app")!
const root = createRoot(container)

root.render(
    <Auth0Provider
        domain="dev-bumkf2nw2ppcfgdw.us.auth0.com"
        clientId="SElP52OAvQlyURqvPQ2GCxhvj798rUTU"
        authorizationParams={{
          redirect_uri: window.location.origin
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
      >
        <ProtectedApp />
    </Auth0Provider>
);