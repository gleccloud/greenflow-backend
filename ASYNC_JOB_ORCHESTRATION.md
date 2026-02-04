# 비동기 작업 큐 및 오케스트레이션 (Async Job Queue & Orchestration)

## Executive Summary

GLEC API의 비동기 작업 요구사항:

### 즉시 처리 필요 (응답 대기)
- EI 입찰 평가 계산 (<1초)
- 제안 순위 재계산 (<500ms)

### 백그라운드 처리 (비동기)
- EI 데이터 수집 (DTG 통합)
- 배차 최적화 AI 계산 (5-30초)
- 노티피케이션 발송
- 감사 로그 기록
- 성능 메트릭 집계

**선택 기술**: **BullMQ** (Node.js Redis 기반 작업 큐)
- 신뢰성: Guaranteed delivery
- 성능: 100K+ jobs/sec
- 기능: Delayed, Recurring, Priority, Retry
- DX: TypeScript 네이티브

---

## 1. BullMQ 설정

### 1.1 작업 큐 정의

```typescript
// src/modules/jobs/job-definitions.ts
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Define all job queues for the system
 */
export class JobQueues {
  // Real-time prioritized jobs
  static readonly EI_UPDATE = 'ei:update'; // EI 데이터 업데이트
  static readonly PROPOSAL_RANKING = 'proposal:ranking'; // 제안 순위 재계산
  static readonly ORDER_STATUS_UPDATE = 'order:status-update'; // 주문 상태 업데이트

  // Background jobs
  static readonly NOTIFICATION = 'notification:send'; // 알림 발송
  static readonly AUDIT_LOG = 'audit:log'; // 감사 로그
  static readonly ANALYTICS = 'analytics:aggregate'; // 분석 데이터 집계
  static readonly DTG_DATA_SYNC = 'data:dtg-sync'; // DTG 데이터 동기화
  static readonly DISPATCH_OPTIMIZE = 'dispatch:optimize'; // 배차 최적화 AI
  static readonly REPORT_GENERATION = 'report:generate'; // 보고서 생성
  static readonly EMAIL_SEND = 'email:send'; // 이메일 발송
  static readonly CLEANUP = 'cleanup:old-data'; // 오래된 데이터 정리
}

/**
 * Queue configuration
 */
export const queueConfig = {
  [JobQueues.EI_UPDATE]: {
    priority: 1, // Highest priority
    concurrency: 20,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600 }, // Remove after 1 hour
    },
  },

  [JobQueues.PROPOSAL_RANKING]: {
    priority: 2,
    concurrency: 10,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 500 },
      removeOnComplete: { age: 1800 },
    },
  },

  [JobQueues.ORDER_STATUS_UPDATE]: {
    priority: 2,
    concurrency: 15,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600 },
    },
  },

  [JobQueues.NOTIFICATION]: {
    priority: 3,
    concurrency: 30,
    defaultJobOptions: {
      attempts: 5, // Retry up to 5 times
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 }, // Remove after 24 hours
    },
  },

  [JobQueues.AUDIT_LOG]: {
    priority: 5, // Lowest priority
    concurrency: 10,
    defaultJobOptions: {
      attempts: 1, // No retry for logs
      removeOnComplete: true,
    },
  },

  [JobQueues.ANALYTICS]: {
    priority: 4,
    concurrency: 5,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: { age: 86400 },
    },
  },

  [JobQueues.DTG_DATA_SYNC]: {
    priority: 2,
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 7200 },
    },
  },

  [JobQueues.DISPATCH_OPTIMIZE]: {
    priority: 1,
    concurrency: 3, // Heavy computation
    defaultJobOptions: {
      attempts: 2,
      timeout: 30000, // 30 second timeout
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { age: 3600 },
    },
  },

  [JobQueues.REPORT_GENERATION]: {
    priority: 4,
    concurrency: 2, // Heavy I/O
    defaultJobOptions: {
      attempts: 3,
      timeout: 60000, // 60 second timeout
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
    },
  },

  [JobQueues.EMAIL_SEND]: {
    priority: 3,
    concurrency: 20,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 },
    },
  },

  [JobQueues.CLEANUP]: {
    priority: 5,
    concurrency: 1,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    },
  },
};
```

### 1.2 Queue Service

```typescript
// src/modules/jobs/queue.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';
import { RedisService } from '../redis/redis.service';
import { JobQueues, queueConfig } from './job-definitions';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private schedulers = new Map<string, QueueScheduler>();
  private redis: Redis;

  constructor(private redisService: RedisService) {
    this.redis = redisService.getClient();
  }

  async onModuleInit(): Promise<void> {
    // Initialize all queues
    Object.keys(JobQueues).forEach((queueName) => {
      const queueKey = JobQueues[queueName];
      const config = queueConfig[queueKey];

      if (config) {
        this.initializeQueue(queueKey, config);
      }
    });

    console.log(`✓ Initialized ${this.queues.size} job queues`);
  }

  async onModuleDestroy(): Promise<void> {
    // Close all workers and queues
    for (const [name, worker] of this.workers) {
      await worker.close();
    }

    for (const [name, scheduler] of this.schedulers) {
      await scheduler.close();
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
    }

    console.log('✓ Closed all job queues');
  }

  private initializeQueue(
    queueName: string,
    config: any,
  ): void {
    const queue = new Queue(queueName, {
      connection: this.redis,
      defaultJobOptions: config.defaultJobOptions,
      settings: {
        lockDuration: 5000, // 5 second lock
        lockRenewTime: 2000,
        maxStalledCount: 3, // Max stalled attempts
        stalledInterval: 30000, // Check stalled jobs every 30s
      },
    });

    // Create scheduler for recurring jobs
    const scheduler = new QueueScheduler(queueName, {
      connection: this.redis,
    });

    // Setup metrics/monitoring
    queue.on('drained', () => {
      console.log(`✓ Queue ${queueName} drained`);
    });

    queue.on('error', (error) => {
      console.error(`✗ Queue ${queueName} error:`, error);
    });

    this.queues.set(queueName, queue);
    this.schedulers.set(queueName, scheduler);
  }

  /**
   * Get a queue instance
   */
  getQueue(queueName: string): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  /**
   * Add job to queue (generic)
   */
  async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: any,
  ): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, {
      ...options,
      jobId: options?.jobId || `${jobName}-${Date.now()}`,
    });

    console.log(`→ Job queued: ${queueName}/${jobName} (ID: ${job.id})`);
    return job;
  }

  /**
   * Add delayed job
   */
  async addDelayedJob(
    queueName: string,
    jobName: string,
    data: any,
    delayMs: number,
    options?: any,
  ): Promise<any> {
    return this.addJob(queueName, jobName, data, {
      ...options,
      delay: delayMs,
    });
  }

  /**
   * Add recurring job (cron pattern)
   */
  async addRecurringJob(
    queueName: string,
    jobName: string,
    data: any,
    cronPattern: string,
    options?: any,
  ): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, {
      ...options,
      repeat: {
        pattern: cronPattern, // e.g., "0 0 * * *" for daily
      },
    });

    console.log(
      `→ Recurring job scheduled: ${queueName}/${jobName} (pattern: ${cronPattern})`,
    );
    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress(),
      status: await job.getState(),
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      createdAt: job.createdOn,
      finishedAt: job.finishedOn,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);

    const counts = await queue.getJobCounts();
    const workers = await queue.getWorkers();
    const activeJobs = await queue.getActiveJobs();

    return {
      queueName,
      jobCounts: counts,
      workerCount: workers.length,
      activeJobsCount: activeJobs.length,
      isPaused: await queue.isPaused(),
    };
  }

  /**
   * Get all queues statistics
   */
  async getAllQueuesStats(): Promise<any[]> {
    const stats = [];

    for (const [queueName] of this.queues) {
      const stat = await this.getQueueStats(queueName);
      stats.push(stat);
    }

    return stats;
  }
}
```

---

## 2. 작업 프로세서 (Job Processors)

### 2.1 EI 업데이트 작업

```typescript
// src/modules/jobs/processors/ei-update.processor.ts
import { Processor, Process, OnWorkerEvent } from '@nestjs/bull';
import { Job } from 'bullmq';
import { EIService } from '../../fleet/ei.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Processor(JobQueues.EI_UPDATE)
export class EIUpdateProcessor {
  constructor(
    private eiService: EIService,
    private realtimeService: RealtimeService,
  ) {}

  @Process()
  async processEIUpdate(job: Job<{ fleet_id: string; new_ei: number }>): Promise<any> {
    const { fleet_id, new_ei } = job.data;

    try {
      job.updateProgress(10);

      // 1. Fetch current EI
      const currentEI = await this.eiService.getFleetEI(fleet_id);
      job.updateProgress(20);

      // 2. Update database
      const oldEI = currentEI.ei_value;
      const updatedEI = await this.eiService.updateFleetEI(fleet_id, new_ei);
      job.updateProgress(50);

      // 3. Invalidate cache
      await this.eiService.invalidateEICache(fleet_id);
      job.updateProgress(70);

      // 4. Publish real-time update
      await this.realtimeService.publishEIUpdate(
        fleet_id,
        oldEI,
        new_ei,
        updatedEI.ei_grade,
      );
      job.updateProgress(100);

      return {
        fleet_id,
        old_ei: oldEI,
        new_ei,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`EI update failed for fleet ${fleet_id}:`, error);
      throw error; // Trigger retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    console.log(`✓ EI update completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    console.error(
      `✗ EI update failed: ${job.id} - Attempt ${job.attemptsMade}/${job.opts.attempts}`,
      error.message,
    );
  }
}
```

### 2.2 제안 순위 재계산 작업

```typescript
// src/modules/jobs/processors/proposal-ranking.processor.ts
import { Processor, Process, OnWorkerEvent } from '@nestjs/bull';
import { Job } from 'bullmq';
import { ProposalService } from '../../bid/proposal.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Processor(JobQueues.PROPOSAL_RANKING)
export class ProposalRankingProcessor {
  constructor(
    private proposalService: ProposalService,
    private realtimeService: RealtimeService,
  ) {}

  @Process()
  async processRankingUpdate(
    job: Job<{
      bid_id: string;
      new_proposal_id?: string;
    }>,
  ): Promise<any> {
    const { bid_id, new_proposal_id } = job.data;

    try {
      job.updateProgress(10);

      // 1. Fetch bid details
      const bid = await this.proposalService.getBid(bid_id);
      job.updateProgress(20);

      // 2. Fetch all proposals for this bid
      const proposals = await this.proposalService.getProposalsForBid(bid_id);
      job.updateProgress(40);

      // 3. Recalculate scores based on evaluation policy
      const rankedProposals = await this.proposalService.calculateScoresAndRank(
        bid_id,
        proposals,
        bid.evaluation_policy,
      );
      job.updateProgress(70);

      // 4. Update database with new rankings
      await this.proposalService.updateProposalRankings(bid_id, rankedProposals);
      job.updateProgress(85);

      // 5. Publish real-time update to all subscribers
      await this.realtimeService.publishProposalRankingUpdate(
        bid_id,
        rankedProposals,
      );
      job.updateProgress(100);

      return {
        bid_id,
        ranked_count: rankedProposals.length,
        top_proposal_id: rankedProposals[0]?.proposal_id,
        top_score: rankedProposals[0]?.composite_score,
      };
    } catch (error) {
      console.error(`Proposal ranking failed for bid ${bid_id}:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any): void {
    console.log(`✓ Proposal ranking completed:`, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    console.error(
      `✗ Proposal ranking failed: ${job.id} - ${error.message}`,
    );
  }
}
```

### 2.3 알림 발송 작업

```typescript
// src/modules/jobs/processors/notification.processor.ts
import { Processor, Process, OnWorkerEvent } from '@nestjs/bull';
import { Job } from 'bullmq';
import { NotificationService } from '../../notifications/notification.service';
import { EmailService } from '../../email/email.service';

@Processor(JobQueues.NOTIFICATION)
export class NotificationProcessor {
  constructor(
    private notificationService: NotificationService,
    private emailService: EmailService,
  ) {}

  @Process()
  async processNotification(
    job: Job<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      related_entity_type?: string;
      related_entity_id?: string;
      send_email?: boolean;
    }>,
  ): Promise<any> {
    const {
      user_id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      send_email,
    } = job.data;

    try {
      job.updateProgress(20);

      // 1. Store in database
      const notification = await this.notificationService.createNotification({
        user_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
      });
      job.updateProgress(50);

      // 2. Send email if requested
      if (send_email) {
        const user = await this.notificationService.getUserEmail(user_id);

        if (user?.email) {
          await this.emailService.sendNotificationEmail({
            to: user.email,
            title,
            message,
            actionUrl: this.notificationService.getActionUrl(
              related_entity_type,
              related_entity_id,
            ),
          });
        }
      }
      job.updateProgress(100);

      return { notification_id: notification.notification_id };
    } catch (error) {
      console.error(`Notification failed for user ${user_id}:`, error);
      throw error; // Retry with exponential backoff
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    console.log(`✓ Notification sent: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    console.error(
      `✗ Notification failed: ${job.id} - Attempt ${job.attemptsMade}/${job.opts.attempts}`,
      error.message,
    );
  }
}
```

### 2.4 배차 최적화 작업 (Heavy Computation)

```typescript
// src/modules/jobs/processors/dispatch-optimize.processor.ts
import { Processor, Process, OnWorkerEvent } from '@nestjs/bull';
import { Job } from 'bullmq';
import { DispatchService } from '../../dispatch/dispatch.service';

@Processor(JobQueues.DISPATCH_OPTIMIZE)
export class DispatchOptimizeProcessor {
  constructor(private dispatchService: DispatchService) {}

  @Process()
  async processOptimization(
    job: Job<{
      batch_id: string;
      orders: any[];
      optimization_goals: any;
    }>,
  ): Promise<any> {
    const { batch_id, orders, optimization_goals } = job.data;

    try {
      job.updateProgress(10);

      // 1. Validate input
      await this.dispatchService.validateBatch(batch_id, orders);
      job.updateProgress(20);

      // 2. Fetch fleet and EI data
      const fleetData = await this.dispatchService.fetchFleetData(orders);
      job.updateProgress(40);

      // 3. Run optimization algorithm (heavy computation)
      // This could call an external ML service or run local algorithm
      const optimizedAssignments =
        await this.dispatchService.optimizeDispatch(
          orders,
          fleetData,
          optimization_goals,
        );
      job.updateProgress(80);

      // 4. Store results in database
      await this.dispatchService.storeOptimizationResults(
        batch_id,
        optimizedAssignments,
      );
      job.updateProgress(100);

      return {
        batch_id,
        optimized_count: optimizedAssignments.length,
        total_cost_saving: optimizedAssignments.reduce(
          (sum, a) => sum + (a.cost_saving || 0),
          0,
        ),
      };
    } catch (error) {
      console.error(`Dispatch optimization failed for batch ${batch_id}:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any): void {
    console.log(`✓ Dispatch optimization completed:`, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    console.error(
      `✗ Dispatch optimization failed: ${job.id} - ${error.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    console.warn(`⚠ Dispatch optimization stalled: ${jobId}`);
  }
}
```

---

## 3. 작업 제출 (Job Submission)

### 3.1 API 엔드포인트에서 작업 제출

```typescript
// src/modules/fleet/fleet.controller.ts
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { QueueService } from '../jobs/queue.service';
import { JobQueues } from '../jobs/job-definitions';

@Controller('fleet')
export class FleetController {
  constructor(private queueService: QueueService) {}

  @Post('ei-update')
  async updateFleetEI(
    @Body() body: { fleet_id: string; new_ei: number },
    @Headers('x-request-id') requestId: string,
  ): Promise<any> {
    const { fleet_id, new_ei } = body;

    // 1. Immediate validation
    if (new_ei < 0 || new_ei > 200) {
      throw new BadRequestException('EI value out of range');
    }

    // 2. Queue background job
    const job = await this.queueService.addJob(
      JobQueues.EI_UPDATE,
      'update-ei',
      { fleet_id, new_ei },
      {
        priority: 1, // High priority
        jobId: `ei-${fleet_id}-${Date.now()}`,
        // Idempotent: same jobId won't create duplicate job
      },
    );

    // 3. Return immediately with job ID
    return {
      status: 'queued',
      job_id: job.id,
      request_id: requestId,
      message: 'EI update queued. Check status via GET /jobs/{job_id}',
    };
  }
}
```

### 3.2 Bid 평가 API

```typescript
// src/modules/bid/bid-evaluation.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { BidEvaluationService } from './bid-evaluation.service';

@Controller('order/bid-evaluation')
export class BidEvaluationController {
  constructor(
    private bidEvaluationService: BidEvaluationService,
    private queueService: QueueService,
  ) {}

  @Post()
  async evaluateBids(@Body() evaluationRequest: any): Promise<any> {
    const { order_id, bid_candidates, evaluation_policy } = evaluationRequest;

    try {
      // 1. Run immediate scoring (synchronous, <1 second)
      const scores = await this.bidEvaluationService.calculateScores(
        bid_candidates,
        evaluation_policy,
      );
      job.updateProgress(50);

      // 2. Queue ranking update job (asynchronous)
      if (scores.length > 0) {
        await this.queueService.addJob(
          JobQueues.PROPOSAL_RANKING,
          'update-ranking',
          {
            bid_id: order_id,
          },
          {
            priority: 2,
            delay: 100, // Small delay to batch updates
          },
        );
      }

      // 3. Return results immediately
      return {
        order_id,
        evaluated_results: scores,
        summary: this.bidEvaluationService.generateSummary(scores),
      };
    } catch (error) {
      console.error('Bid evaluation failed:', error);
      throw error;
    }
  }
}
```

---

## 4. 재시도 및 실패 처리

### 4.1 재시도 전략

```typescript
/**
 * Exponential backoff retry strategy
 */
const retryConfig = {
  EI_UPDATE: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    // Retry after: 1s, 2s, 4s
  },

  PROPOSAL_RANKING: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 500 },
    // Retry after: 0.5s, 1s
  },

  NOTIFICATION: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    // Retry after: 2s, 4s, 8s, 16s, 32s
  },

  REPORT_GENERATION: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    // Retry after: 5s, 10s, 20s
  },
};
```

### 4.2 실패 처리 및 알림

```typescript
// src/modules/jobs/job-error-handler.service.ts
@Injectable()
export class JobErrorHandlerService {
  constructor(
    private notificationService: NotificationService,
    private logService: LogService,
  ) {}

  async handleJobFailure(
    job: Job,
    error: Error,
  ): Promise<void> {
    // 1. Log error
    await this.logService.logJobFailure({
      job_id: job.id,
      queue_name: job.queueName,
      job_name: job.name,
      error_message: error.message,
      stack_trace: error.stack,
      attempts: job.attemptsMade,
      max_attempts: job.opts.attempts,
    });

    // 2. If max attempts exceeded, notify admin
    if (job.attemptsMade >= job.opts.attempts) {
      await this.notificationService.notifyAdmins({
        type: 'JOB_FAILED',
        severity: 'HIGH',
        title: `Job Failed: ${job.name}`,
        message: `Job ${job.id} in queue ${job.queueName} failed after ${job.attemptsMade} attempts`,
        details: {
          job_id: job.id,
          error: error.message,
          data: job.data,
        },
      });
    }
  }
}
```

---

## 5. 작업 모니터링 및 메트릭

### 5.1 Queue 모니터링 API

```typescript
// src/modules/jobs/job-monitor.controller.ts
@Controller('admin/jobs')
export class JobMonitorController {
  constructor(private queueService: QueueService) {}

  @Get('queues/stats')
  async getQueueStats(): Promise<any> {
    return await this.queueService.getAllQueuesStats();
  }

  @Get('queues/:queueName/stats')
  async getQueueSpecificStats(
    @Param('queueName') queueName: string,
  ): Promise<any> {
    return await this.queueService.getQueueStats(queueName);
  }

  @Get('jobs/:jobId/status')
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Query('queueName') queueName: string,
  ): Promise<any> {
    return await this.queueService.getJobStatus(queueName, jobId);
  }

  @Post('jobs/:jobId/retry')
  async retryJob(
    @Param('jobId') jobId: string,
    @Query('queueName') queueName: string,
  ): Promise<any> {
    const queue = this.queueService.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await job.retry();

    return { status: 'retrying', job_id: jobId };
  }

  @Delete('jobs/:jobId')
  async removeJob(
    @Param('jobId') jobId: string,
    @Query('queueName') queueName: string,
  ): Promise<any> {
    const queue = this.queueService.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await job.remove();

    return { status: 'removed', job_id: jobId };
  }
}
```

### 5.2 메트릭 수집

```typescript
// src/modules/jobs/job-metrics.service.ts
@Injectable()
export class JobMetricsService {
  constructor(
    private redisService: RedisService,
    private prometheusService: PrometheusService,
  ) {}

  async trackJobCompletion(
    job: Job,
    result: any,
  ): Promise<void> {
    const duration = Date.now() - job.createdOn;

    // 1. Update Redis counters
    const key = `metrics:job:${job.name}`;
    await this.redisService.getClient().incr(`${key}:completed`);
    await this.redisService.getClient().incrby(`${key}:total_duration`, duration);

    // 2. Record Prometheus metrics
    this.prometheusService.recordJobDuration(job.name, duration);
    this.prometheusService.incrementJobCounter(job.name, 'completed');
  }

  async trackJobFailure(job: Job, error: Error): Promise<void> {
    const key = `metrics:job:${job.name}`;
    await this.redisService.getClient().incr(`${key}:failed`);
    this.prometheusService.incrementJobCounter(job.name, 'failed');
  }

  async getJobMetrics(jobName: string): Promise<any> {
    const redis = this.redisService.getClient();
    const key = `metrics:job:${jobName}`;

    const completed = await redis.get(`${key}:completed`) || 0;
    const failed = await redis.get(`${key}:failed`) || 0;
    const totalDuration = await redis.get(`${key}:total_duration`) || 0;

    return {
      job_name: jobName,
      completed,
      failed,
      success_rate: completed / (completed + failed),
      avg_duration_ms: completed > 0 ? totalDuration / completed : 0,
    };
  }
}
```

---

## 6. 스케줄된 작업 (Scheduled/Recurring Jobs)

### 6.1 데일리 분석 집계

```typescript
// src/modules/jobs/schedulers/daily-analytics.scheduler.ts
@Injectable()
export class DailyAnalyticsScheduler {
  constructor(private queueService: QueueService) {}

  onModuleInit(): void {
    this.scheduleAnalytics();
  }

  private scheduleAnalytics(): void {
    // Run every day at 00:00 UTC
    this.queueService.addRecurringJob(
      JobQueues.ANALYTICS,
      'daily-aggregate',
      {
        aggregation_type: 'daily',
        date: new Date().toISOString().split('T')[0],
      },
      '0 0 * * *', // Cron pattern
      {
        removeOnComplete: { age: 86400 * 7 }, // Keep 7 days
      },
    );
  }
}
```

### 6.2 자정 데이터 정리

```typescript
// src/modules/jobs/schedulers/cleanup.scheduler.ts
@Injectable()
export class CleanupScheduler {
  constructor(private queueService: QueueService) {}

  onModuleInit(): void {
    this.scheduleCleanup();
  }

  private scheduleCleanup(): void {
    // Run every day at 02:00 UTC (after main traffic)
    this.queueService.addRecurringJob(
      JobQueues.CLEANUP,
      'cleanup-old-data',
      {
        retention_days: {
          api_logs: 90,
          ei_history: 730, // 2 years
          notifications: 180,
          completed_jobs: 30,
        },
      },
      '0 2 * * *',
    );
  }
}
```

---

## Summary

**BullMQ 작업 큐 아키텍처**:

| 큐 | 우선도 | 동시성 | 용도 |
|---|-------|-------|------|
| EI_UPDATE | 1 (높음) | 20 | Fleet EI 데이터 업데이트 |
| PROPOSAL_RANKING | 2 | 10 | 제안 순위 재계산 |
| ORDER_STATUS_UPDATE | 2 | 15 | 주문 상태 변경 |
| DISPATCH_OPTIMIZE | 1 | 3 | 배차 최적화 AI |
| NOTIFICATION | 3 | 30 | 알림 발송 |
| AUDIT_LOG | 5 (낮음) | 10 | 감사 로그 기록 |
| ANALYTICS | 4 | 5 | 분석 데이터 집계 |
| EMAIL_SEND | 3 | 20 | 이메일 발송 |
| CLEANUP | 5 | 1 | 데이터 정리 |

**특징**:
- ✓ Guaranteed delivery (3번 재시도)
- ✓ Exponential backoff (지연 증가)
- ✓ Priority-based processing
- ✓ Progress tracking (0-100%)
- ✓ Job status monitoring
- ✓ Recurring jobs (Cron patterns)
- ✓ Idempotent job IDs
- ✓ Comprehensive error handling
