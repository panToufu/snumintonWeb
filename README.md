This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## OB 신청 인원 제한

- 한 일정에 OB는 최대 4명까지 신청할 수 있습니다. 현재 OB 신청을 받는 정기 운동과 레슨에 모두 적용됩니다.
- OB는 기존과 같이 일반 정원 및 대기열과 별도로 집계합니다. 일반 부원과 게스트의 신청 방식은 유지합니다.
- 신청 화면에 규칙과 OB 신청 인원을 표시하고, 4명 이상이면 OB 신청 버튼을 비활성화합니다. 명단 새로고침으로 취소 후 빈자리를 확인할 수 있습니다.
- API가 OB 인원을 확인하며, DB 트리거가 동시 신청을 일정별로 직렬화해 초과 신청을 막습니다. 정원 초과 응답은 HTTP 409, `OB_CAPACITY_REACHED`입니다.
- 기존에 4명을 초과한 명단은 보존합니다. 추가 OB 신청은 현재 인원이 4명 미만으로 줄어든 뒤 가능합니다. 기존 신청의 출석·입금 수정은 가능합니다.

배포 전에 `supabase/migrations/20261024040533_enforce_ob_application_capacity.sql`을 해당 Supabase 프로젝트에 적용해야 합니다. **API의 사전 인원 검사만으로는 동시 신청을 막을 수 없습니다.** 제한 변경 시 `lib/application-policy.ts`와 DB 트리거의 숫자를 함께 변경하세요.

## 공지 팝업

메인 화면 좌측 상단의 알림 버튼에서 OB 신청 안내를 언제든 다시 볼 수 있습니다. 처음 방문하면 공지 팝업을 자동으로 표시하며, 확인 버튼·닫기 버튼·Escape·팝업 바깥 클릭으로 닫을 때 해당 브라우저의 `localStorage`에 확인 여부를 저장합니다. 같은 공지는 다음 방문부터 자동으로 표시하지 않습니다. 브라우저 데이터를 삭제하거나 다른 브라우저·기기를 사용하면 다시 표시될 수 있습니다.

공지를 변경할 때는 `components/SiteNotice.tsx`의 내용과 `NOTICE_STORAGE_KEY` 버전을 함께 변경하세요. 브라우저 저장소 사용이 차단된 경우에도 공지를 읽고 닫을 수 있지만, 확인 여부는 다음 방문까지 유지되지 않을 수 있습니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
