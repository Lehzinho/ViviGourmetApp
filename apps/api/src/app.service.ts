import { Injectable } from "@nestjs/common";
import type { HealthStatus } from "@vivi-gourmet/shared";
import { isoNow } from "@vivi-gourmet/shared";

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      ok: true,
      service: "vivi-gourmet-api",
      timestamp: isoNow(),
    };
  }
}
