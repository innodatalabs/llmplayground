import { useAuth0 } from "@auth0/auth0-react";
import React from "react"
import { Link } from "react-router-dom"
import appConfig from "../../config"

export default function NavBar({ tab, children }: any) {
  const { user, logout } = useAuth0();

  const menuOptions = ["chat", "promptgen"]

  if (user?.isAdmin) {
      menuOptions.push("settings");
  }
  
  const menu = menuOptions.map((menuName, index) => (
    <div key = {menuName} className="align-middle mt-1 flex items-center">
      <Link
        to={`/${index > 0 ? menuName: ''}`}
        className={
          tab === menuName
          ? "cursor-default"
          : "cursor-pointer"
        }>
        <p
          className={
            tab === menuName
            ? "text-xl font-semibold"
            : "text-xl font-medium text-gray-500 hover:text-gray-900"
          }
        >
          {menuName.charAt(0).toUpperCase() + menuName.slice(1)}
        </p>
      </Link>
    </div>
  ))

  return (
    <div className="flex flex-col font-display mb-3 border">
      <div className="flex inline-block mx-5 my-2 gap-x-4 flex-wrap">
        {menu}
        
        <div className ="flex-1" />
          <div
            className = "ml-4 mt-1 cursor-pointer flex justify-end items-center self-flex-end"
            onClick={() => {
              window.open("https://github.com/nat/openplayground", "_blank")
            }}
            >
            <img
              className = "h-[35px]"
              src= "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            />
          </div>
          <div
            className = "ml-4 mt-1 cursor-pointer flex justify-end items-center self-flex-end"
          >
            <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
              Log Out
            </button>
          </div>
        {children}
      </div>
    </div>
  )
}