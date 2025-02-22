// plugin
export enum pluginAnnotations {
  DISPLAY_NAME = "plugin.halo.run/display-name",
}

// rbac
export enum rbacAnnotations {
  MODULE = "rbac.authorization.halo.run/module",
  ROLE_NAMES = "rbac.authorization.halo.run/role-names",
  DISPLAY_NAME = "rbac.authorization.halo.run/display-name",
  DEPENDENCIES = "rbac.authorization.halo.run/dependencies",
  AVATAR_ATTACHMENT_NAME = "halo.run/avatar-attachment-name",
  LAST_AVATAR_ATTACHMENT_NAME = "halo.run/last-avatar-attachment-name",
  REDIRECT_ON_LOGIN = "rbac.authorization.halo.run/redirect-on-login",
}

// content

export enum contentAnnotations {
  PREFERRED_EDITOR = "content.halo.run/preferred-editor",
}

// pat
export enum patAnnotations {
  ACCESS_TOKEN = "security.halo.run/access-token",
}
