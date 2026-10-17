// Prefer real lessons in each bank; retain its demos as a fallback.
export function studentExercises(items){
 const lessons=items.filter(entry=>!entry.exercise.title.includes('演示练习'));
 return lessons.length?lessons:items;
}
