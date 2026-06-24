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
                const keysToRemove = [
                    'userToken', 'userEmail', 'email',
                    'selectedProjectId_blocks', 'selectedProjectId_editor',
                    'selectedProjectId_genetic', 'selectedProjectId_algorithm',
                    'selectedProjectId_matrices', 'userEmail_matrices'
                ];
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            return throwError(() => error);
        })
    );
};
