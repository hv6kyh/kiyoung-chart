import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css']
})
export class LandingComponent {
    // 히어로 통계 데이터
    version = 'v0.1';
    matchRate = 94.8;
    matchCount = 1240;

    // Q&A 섹션 채팅 내역
    chatHistory = [
        { type: 'bot', content: '안녕하세요! 주식에 대해 궁금한 점을 물어보세요.' },
        { type: 'user', content: '골든크로스가 무엇인가요?' },
        { type: 'bot', content: '골든크로스는 단기 이평선이 장기 이평선을 위로 돌파할 때를 말하며, 강력한 상승 신호로 해석될 수 있어요! 📈' }
    ];
}
