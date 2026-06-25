<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="feedback-overlay" @click.self="$emit('close')">
      <div class="feedback-modal">
        <div class="feedback-header">
          <span class="feedback-title">📝 用户反馈</span>
          <button class="feedback-close" @click="$emit('close')">✕</button>
        </div>
        <div class="feedback-body">
          <p class="feedback-desc">你的意见对我们很重要！点击下方按钮，在飞书表单中提交反馈。</p>
          <div class="feedback-actions">
            <button class="btn-cancel" @click="$emit('close')">取消</button>
            <a :href="formUrl" target="_blank" rel="noopener" class="btn-submit" @click="$emit('close')">
              打开反馈表单 →
            </a>
          </div>
          <p class="feedback-hint">无需登录飞书，任何人都可以填写</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits<{ close: [] }>()

const formUrl = 'https://rsjqcmnt5p.feishu.cn/share/base/form/shrcnHh4XGxeQ54vzt1FjsCzu1e'
</script>

<style scoped>
.feedback-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.65); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.feedback-modal {
  width: 400px; max-width: 92vw;
  background: #1a1d24; border: 1px solid rgba(0,229,255,.15);
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}
.feedback-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06);
}
.feedback-title { font-size: 14px; font-weight: 600; color: #e6edf3; font-family: inherit; }
.feedback-close {
  background: none; border: none; color: #5c6370; font-size: 16px;
  cursor: pointer; padding: 2px 6px; transition: color .15s;
}
.feedback-close:hover { color: #c9d1d3; }

.feedback-body {
  padding: 24px 18px;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
}
.feedback-desc {
  font-size: 12px; color: #8b949e; line-height: 1.6;
  margin: 0; text-align: center; font-family: inherit;
}
.feedback-actions {
  display: flex; gap: 10px;
}
.btn-cancel {
  padding: 8px 20px; font-size: 12px; font-family: inherit;
  background: transparent; border: 1px solid rgba(255,255,255,.1);
  color: #8b949e; border-radius: 6px; cursor: pointer;
  transition: all .15s; text-decoration: none;
}
.btn-cancel:hover { border-color: rgba(255,255,255,.2); color: #c9d1d3; }
.btn-submit {
  padding: 8px 20px; font-size: 12px; font-family: inherit; font-weight: 600;
  background: rgba(0,229,255,.12); border: 1px solid rgba(0,229,255,.3);
  color: #00e5ff; border-radius: 6px; cursor: pointer;
  transition: all .15s; text-decoration: none; display: inline-block;
}
.btn-submit:hover { background: rgba(0,229,255,.2); border-color: #00e5ff; }
.feedback-hint {
  font-size: 10px; color: #3a3f47; margin: 0; font-family: inherit;
}

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: all .25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .feedback-modal { transform: translateY(10px) scale(.97); }
.modal-fade-leave-to .feedback-modal { transform: translateY(-6px) scale(.98); }
</style>
