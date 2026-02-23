<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDateTime } from '$lib/utils/datetime';

  let currentYear: number;

  // 動態獲取當前年份
  onMount(() => {
    // 使用 formatDateTime 獲取當前年份，確保時區一致性
    currentYear = Number(formatDateTime(new Date(), 'yyyy'));
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