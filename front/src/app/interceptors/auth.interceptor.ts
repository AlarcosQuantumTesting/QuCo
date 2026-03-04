import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

    if (req.url.includes('/proxyaotro'))
        return next(req);

    const authReq = req.clone({
        withCredentials: true
    });

    return next(authReq);
};
