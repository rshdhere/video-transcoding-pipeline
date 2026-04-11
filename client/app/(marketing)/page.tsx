import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      <Button variant={"link"}>
        <Link href={"/signup"}>Signup</Link>
      </Button>
      <Button variant={"link"}>
        <Link href={"/login"}>Login</Link>
      </Button>
    </div>
  )
}
