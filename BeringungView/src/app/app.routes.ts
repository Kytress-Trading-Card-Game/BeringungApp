import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AppEinstellungen } from './app-einstellungen/app-einstellungen';
import { VogelList } from './vogel-list/vogel-list';
import { ArtenVerwalten } from './arten-verwalten/arten-verwalten';

export const routes: Routes = [
	{
		path: '',
		component: Dashboard
	},
	{
		path: 'voegel',
		component: VogelList
	},
	{
		path: 'einstellungen',
		component: AppEinstellungen
	},
	{
		path: 'arten',
		component: ArtenVerwalten
	}
];
