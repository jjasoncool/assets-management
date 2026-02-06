export function getMaintenanceTypeLabel(type: string): string {
	switch (type) {
		case 'preventive':
			return '預防性';
		case 'corrective':
			return '修復性';
		default:
			return type;
	}
}
