import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createExportJob, getExportStatus } from "./audioExport";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  audioExport: router({
    start: publicProcedure
      .input(z.object({ playlistUrl: z.string().trim().min(1).max(500) }))
      .mutation(({ input }) => {
        try {
          return createExportJob(input.playlistUrl);
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "재생목록 URL을 확인해 주세요.");
        }
      }),
    status: publicProcedure
      .input(z.object({ jobId: z.string().uuid() }))
      .query(({ input }) => {
        const status = getExportStatus(input.jobId);
        if (!status) throw new Error("작업을 찾을 수 없거나 만료되었습니다.");
        return status;
      }),
  }),
});

export type AppRouter = typeof appRouter;
