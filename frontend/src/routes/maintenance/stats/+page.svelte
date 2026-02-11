<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Chart, registerables } from 'chart.js/auto';

	let { data } = $props();

	let barChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);

	$effect(() => {
		// The effect should be self-contained. It depends on `data` and `barChartCanvas`
		if (!data.costByCategory || !barChartCanvas) {
			return;
		}

		// It's safe to register this multiple times.
		Chart.register(...registerables);

		// When the effect re-runs (e.g. on data change), destroy the old chart
		const existingChart = Chart.getChart(barChartCanvas);
		if (existingChart) {
			existingChart.destroy();
		}

		// And create a new one.
		new Chart(barChartCanvas, {
			type: 'bar',
			data: {
				labels: data.costByCategory.labels,
				datasets: [
					{
						label: '各類別維護總成本',
						data: data.costByCategory.data,
						backgroundColor: 'rgba(54, 162, 235, 0.6)',
						borderColor: 'rgba(54, 162, 235, 1)',
						borderWidth: 1
					}
				]
			},
			options: {
				scales: {
					y: {
						beginAtZero: true
					}
				},
				responsive: true,
				plugins: {
					legend: {
						position: 'top'
					},
					title: {
						display: false // 標題改由 card-header 提供
					}
				}
			}
		});
	});
</script>

<svelte:head>
	<title>維護成本分析</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-4">
		<Navbar />

		{#if data.error}
			<div class="alert alert-danger mt-4" role="alert">
				{data.error}
			</div>
		{:else}
			<!-- Stats Cards -->
			<div class="row mt-4">
				<div class="col-md-6 col-xl-4 mb-4">
					<div class="card shadow-sm bg-white bg-opacity-90">
						<div class="card-body">
							<div class="d-flex align-items-center">
								<div class="flex-grow-1">
									<h5 class="text-muted fw-normal mt-0" title="Total Cost">總維護成本</h5>
									<h3 class="mt-3 mb-3">${data.totalCost?.toLocaleString() || 0}</h3>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="col-md-6 col-xl-4 mb-4">
					<div class="card shadow-sm bg-white bg-opacity-90">
						<div class="card-body">
							<div class="d-flex align-items-center">
								<div class="flex-grow-1">
									<h5 class="text-muted fw-normal mt-0" title="Total Records">總維護次數</h5>
									<h3 class="mt-3 mb-3">{data.totalRecords || 0}</h3>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="col-md-6 col-xl-4 mb-4">
					<div class="card shadow-sm bg-white bg-opacity-90">
						<div class="card-body">
							<div class="d-flex align-items-center">
								<div class="flex-grow-1">
									<h5 class="text-muted fw-normal mt-0" title="Average Cost">平均維護成本</h5>
									<h3 class="mt-3 mb-3">
										${data.averageCost?.toLocaleString('en-US', {
											maximumFractionDigits: 2
										}) || 0}
									</h3>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Charts -->
			<div class="row">
				<div class="col-xl-12">
					<div class="card shadow-sm bg-white bg-opacity-90">
						<div class="card-header bg-white bg-opacity-90 py-3">
							<h5 class="card-title mb-0 fw-bold">成本分佈</h5>
						</div>
						<div class="card-body">
							<canvas bind:this={barChartCanvas} style="min-height: 300px;"></canvas>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
