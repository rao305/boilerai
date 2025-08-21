// CODO functionality has been removed - focusing on Computer Science prerequisites only

export class CODOEvaluationService {
  async evaluateEligibility(): Promise<any> {
    return {
      message: "CODO functionality has been removed. BoilerAI now focuses only on Computer Science prerequisites and course tracking.",
      disabled: true
    };
  }
}

export const codoEvaluationService = new CODOEvaluationService();