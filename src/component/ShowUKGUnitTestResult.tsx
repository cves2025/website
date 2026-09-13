import { StudentResultData } from "./marksTypes";

interface ShowUKGUnitTestResultProps {
  whichClass?: string;
  resultData?: StudentResultData | null;
}

function ShowUKGUnitTestResult(_: ShowUKGUnitTestResultProps) {
  return (
    <div>
      UKG
    </div>
  )
}

export default ShowUKGUnitTestResult
