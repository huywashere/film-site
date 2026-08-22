import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from "@nestjs/common";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 8000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException({
                statusCode: 408,
                message: `Yêu cầu máy chủ xử lý quá thời gian quy định (Timeout ${this.timeoutMs / 1000}s). Vui lòng thử lại sau.`,
                error: "Request Timeout",
              }),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
