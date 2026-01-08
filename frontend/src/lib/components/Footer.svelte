<script lang="ts">
  let currentYear: number;

  // 動態獲取當前年份
  import { onMount } from 'svelte';

  onMount(() => {
    currentYear = new Date().getFullYear();
  });
</script>

<footer class="row tm-mt-small">
    <div class="col-12 fw-light">
        <p class="d-inline-block tm-bg-black text-white py-2 px-4">
            Copyright &copy; {currentYear || 2024} Admin Dashboard . Created by
            <a rel="nofollow" href="https://www.egst.com.tw" class="text-white tm-footer-link">EGST</a>
        </p>
    </div>
</footer>