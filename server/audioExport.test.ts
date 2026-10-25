import { describe, expect, it } from "vitest";
import { createExportJob, friendlyYoutubeError, isPlaylistUrl } from "./audioExport";

describe("audio export URL validation", () => {
  it("accepts standard YouTube playlist URLs", () => {
    expect(isPlaylistUrl("https://www.youtube.com/playlist?list=PL123456789")).toBe(true);
    expect(isPlaylistUrl("https://m.youtube.com/watch?v=abc&list=PL123456789")).toBe(true);
  });

  it("rejects non-playlist and non-YouTube URLs", () => {
    expect(isPlaylistUrl("https://www.youtube.com/watch?v=abc")).toBe(false);
    expect(isPlaylistUrl("https://example.com/playlist?list=PL123")).toBe(false);
    expect(isPlaylistUrl("not a url")).toBe(false);
  });

  it("creates a queued job with safe initial state", () => {
    process.env.YT_DLP_PATH = "/definitely/missing/yt-dlp";
    const job = createExportJob("https://www.youtube.com/playlist?list=PL123456789");
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(job.status).toBe("queued");
    expect(job.progress).toBe(0);
    expect(job.downloadUrl).toBeNull();
  });

  it("throws for malformed playlist URLs", () => {
    expect(() => createExportJob("https://www.youtube.com/watch?v=abc")).toThrow("유효한 YouTube 재생목록 URL");
  });

  it("turns YouTube bot checks into an actionable message", () => {
    expect(friendlyYoutubeError(new Error("Sign in to confirm you're not a bot"))).toContain("YouTube가 이 서버의 개별 영상 접근을 차단했습니다");
    expect(friendlyYoutubeError(new Error("network timeout"))).toBe("network timeout");
  });
});
