import { redirect } from "next/navigation";

// 페르소나 편집은 에이전트 관리(로스터)로 합쳐졌다. 예전 주소로 들어오면 새 화면으로 보낸다.
export default function PersonasRedirect() {
  redirect("/agents/roster");
}
