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
    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const contentType = String(request?.headers?.["content-type"] || "");
    const isLongRunningAdminTask =
      request?.method === "POST" &&
      ((request?.originalUrl?.startsWith("/api/v1/admin/media/uploads") &&
        contentType.toLowerCase().startsWith("multipart/form-data")) ||
       request?.originalUrl?.includes("/admin/storyboard/"));

    // A video upload is streamed and then handed to the background worker.
    // Applying the global eight-second API timeout would terminate valid large
    // uploads; authentication, file limits and transcoding timeouts still apply.
    if (isLongRunningAdminTask) {
      return next.handle();
    }

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
