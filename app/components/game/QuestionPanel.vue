<template>
  <div class="panel">
    <h2 :style="{ color: question.color }">{{ question.catName }}</h2>
    <p class="question-text">{{ question.text }}</p>
    <div class="answers">
      <button v-for="(opt, i) in question.options" :key="i"
              class="answer" :class="{ correct: answered && i === question.correct, wrong: answered === i && i !== question.correct }"
              :disabled="answered !== null" @click="$emit('answer', i)">
        {{ opt }}
      </button>
    </div>
    <p class="feedback">{{ feedback }}</p>
  </div>
</template>

<script setup>
defineProps({
  question: Object,   // { catName, color, text, options, correct }
  answered: Number,    // index répondu ou null
  feedback: String
});
defineEmits(["answer"]);
</script>

<style scoped>
.panel { background: #3d3d3d; border-radius: 8px; padding: 16px 20px; border: 1px solid #4a4a4a; margin-bottom: 16px; }
.panel h2 { margin-top: 0; font-size: 1.1rem; }
.question-text { font-size: 1.1rem; margin: 8px 0 14px; }
.answers { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
.answer {
  background: #333333; color: #fff; border: 1px solid #4a4a4a;
  padding: 8px 14px; border-radius: 8px; text-align: left; line-height: 1.3; cursor: pointer;
}
.answer:hover:not(:disabled) { border-color: #38bdf8; }
.answer.correct { background: #2a9d8f; border-color: #1f7d70; }
.answer.wrong { background: #e63946; border-color: #b02a35; }
.answer:disabled { cursor: default; }
.feedback { font-weight: 600; min-height: 1.2em; margin-top: 10px; }
</style>
