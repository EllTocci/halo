import { rbacAnnotations } from "@/constants/annotations";
import { useUserStore } from "@/stores/user";
import type { Router } from "vue-router";

const whiteList = ["Setup", "Login", "Binding"];

export function setupAuthCheckGuard(router: Router) {
  router.beforeEach((to, from, next) => {
    const userStore = useUserStore();

    if (userStore.isAnonymous) {
      if (whiteList.includes(to.name as string)) {
        next();
        return;
      }

      next({
        name: "Login",
        query: {
          redirect_uri: encodeURIComponent(window.location.href),
        },
      });
      return;
    } else {
      if (to.name === "Login") {
        if (to.query.redirect_uri) {
          next({
            name: "Redirect",
            query: {
              redirect_uri: to.query.redirect_uri,
            },
          });
          return;
        }

        const roleHasRedirectOnLogin = userStore.currentRoles?.find(
          (role) =>
            role.metadata.annotations?.[rbacAnnotations.REDIRECT_ON_LOGIN]
        );

        if (roleHasRedirectOnLogin) {
          window.location.href =
            roleHasRedirectOnLogin.metadata.annotations?.[
              rbacAnnotations.REDIRECT_ON_LOGIN
            ] || "/";
          return;
        }

        next({
          name: "Dashboard",
        });
        return;
      }
    }

    next();
  });
}
