import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MarketComponent } from './pages/market/market.component';
import { StockDetailsComponent } from './pages/market/stock-details/stock-details.component';
import { PortfolioComponent } from './pages/portfolio/portfolio.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { AnalysisComponent } from './pages/analysis/analysis.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'market', component: MarketComponent, canActivate: [authGuard] },
  { path: 'market/:symbol', component: StockDetailsComponent, canActivate: [authGuard] },
  { path: 'portfolio', component: PortfolioComponent, canActivate: [authGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },
  { path: 'analysis', component: AnalysisComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
