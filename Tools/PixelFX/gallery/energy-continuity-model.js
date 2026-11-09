// Review-only orchestration. Neither effect imports this file or owns the other's lifetime.
export const review={orbHold:.96,burstDuration:.82,gap:.50,orbOffset:.144};
export const reviewEnd=review.orbHold+review.burstDuration;
export const reviewDuration=reviewEnd+review.gap;
export function sampleReview(time){
 const t=Math.max(0,Math.min(reviewDuration,time));
 if(t<review.orbHold)return {stage:'orb',time:review.orbOffset+t};
 if(t<reviewEnd)return {stage:'burst',time:t-review.orbHold};
 return {stage:'gap',time:review.burstDuration};
}
