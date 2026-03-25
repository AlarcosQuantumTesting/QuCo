import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

    if (req.url.includes('/proxyaotro'))
        return next(req);

    const authReq = req.clone({
        withCredentials: true
    });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // Clear local storage if session expired
                localStorage.removeItem('userToken');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('selectedProjectId_blocks');
                localStorage.removeItem('selectedProjectId_editor');
                localStorage.removeItem('selectedProjectId_genetic');
                localStorage.removeItem('selectedProjectId_algorithm');
                localStorage.removeItem('selectedProjectId_matrices');
            }
            return throwError(() => error);
        })
    );
};
