/**
 * Agent State Machine
 * Manages state transitions and validates allowed transitions
 */

import { AgentState, AgentContext, StateTransition, AgentError } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger';

// Define valid state transitions
const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  [AgentState.IDLE]: [AgentState.INITIALIZING],
  [AgentState.INITIALIZING]: [AgentState.LOADING_INPUTS, AgentState.ERROR],
  [AgentState.LOADING_INPUTS]: [AgentState.VALIDATING, AgentState.ERROR],
  [AgentState.VALIDATING]: [AgentState.AWAITING_APPROVAL, AgentState.ERROR],
  [AgentState.AWAITING_APPROVAL]: [AgentState.EXECUTING, AgentState.ABORTED],
  [AgentState.EXECUTING]: [AgentState.PAUSED, AgentState.REPORTING, AgentState.ERROR],
  [AgentState.PAUSED]: [AgentState.EXECUTING, AgentState.ABORTED],
  [AgentState.REPORTING]: [AgentState.COMPLETED, AgentState.ERROR],
  [AgentState.COMPLETED]: [AgentState.IDLE],
  [AgentState.ERROR]: [AgentState.IDLE],
  [AgentState.ABORTED]: [AgentState.IDLE]
};

export class StateMachine {
  private context: AgentContext;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.context = this.createInitialContext();
  }

  private createInitialContext(): AgentContext {
    return {
      sessionId: uuidv4(),
      currentState: AgentState.IDLE,
      stateHistory: [],
      startTime: new Date()
    };
  }

  /**
   * Get the current agent context
   */
  getContext(): AgentContext {
    return { ...this.context };
  }

  /**
   * Get the current state
   */
  getCurrentState(): AgentState {
    return this.context.currentState;
  }

  /**
   * Check if a transition to the target state is valid
   */
  canTransitionTo(targetState: AgentState): boolean {
    const validTargets = VALID_TRANSITIONS[this.context.currentState];
    return validTargets?.includes(targetState) ?? false;
  }

  /**
   * Get all valid transitions from current state
   */
  getValidTransitions(): AgentState[] {
    return VALID_TRANSITIONS[this.context.currentState] || [];
  }

  /**
   * Transition to a new state
   */
  transitionTo(targetState: AgentState, trigger: string): boolean {
    if (!this.canTransitionTo(targetState)) {
      this.logger.error(`Invalid state transition: ${this.context.currentState} -> ${targetState}`);
      return false;
    }

    const transition: StateTransition = {
      from: this.context.currentState,
      to: targetState,
      trigger,
      timestamp: new Date()
    };

    this.context.stateHistory.push(transition);
    this.context.currentState = targetState;

    this.logger.info(`State transition: ${transition.from} -> ${transition.to}`, {
      trigger,
      sessionId: this.context.sessionId
    });

    // Set end time for terminal states
    if ([AgentState.COMPLETED, AgentState.ERROR, AgentState.ABORTED].includes(targetState)) {
      this.context.endTime = new Date();
    }

    return true;
  }

  /**
   * Set error in context
   */
  setError(error: AgentError): void {
    this.context.error = error;
    this.transitionTo(AgentState.ERROR, `Error: ${error.code}`);
  }

  /**
   * Set test case ID in context
   */
  setTestCaseId(testCaseId: string): void {
    this.context.testCaseId = testCaseId;
  }

  /**
   * Reset the state machine to initial state
   */
  reset(): void {
    this.context = this.createInitialContext();
    this.logger.info('State machine reset', { sessionId: this.context.sessionId });
  }

  /**
   * Check if agent is in a terminal state
   */
  isTerminal(): boolean {
    return [AgentState.COMPLETED, AgentState.ERROR, AgentState.ABORTED].includes(
      this.context.currentState
    );
  }

  /**
   * Check if agent is currently running
   */
  isRunning(): boolean {
    return [
      AgentState.INITIALIZING,
      AgentState.LOADING_INPUTS,
      AgentState.VALIDATING,
      AgentState.AWAITING_APPROVAL,
      AgentState.EXECUTING,
      AgentState.PAUSED,
      AgentState.REPORTING
    ].includes(this.context.currentState);
  }
}
