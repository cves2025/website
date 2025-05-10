import React from "react";
import { useState } from "react";
const FAQSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenTwo, setIsOpenTwo] = useState(false);
  const [isOpenThree, setIsOpenThree] = useState(false);
  const [isOpenFour, setIsOpenFour] = useState(false);
  const [isOpenFive, setIsOpenFive] = useState(false);
  const [isOpenSix, setIsOpenSix] = useState(false);
  const [isOpenSeven, setIsOpenSeven] = useState(false);
  const [isOpenEight, setIsOpenEight] = useState(false);
  const [isOpenNine, setIsOpenNine] = useState(false);
  const [isOpenTen, setIsOpenTen] = useState(false);
  const [isOpenEleven, setIsOpenEleven] = useState(false);
  const [isOpenTwelve, setIsOpenTwelve] = useState(false);
  const [isOpenThirteen, setIsOpenThriteen] = useState(false);
  const [isOpenFourteen, setIsOpenFourteen] = useState(false);
  const [isOpenFifteen, setIsOpenFifteen] = useState(false);
  const [isOpenSixteen, setIsOpenSixteen] = useState(false);
  const [isOpenSeventeen, setIsOpenSeventeen] = useState(false);
  const [isOpenEighteen, setIsOpenyEighteen] = useState(false);
  return (
    <div>
      <h1 className=" text-center relative -top-10 text-3xl  font-semibold text-blue-950">
        FAQ'S SECTION
      </h1>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpen((prop) => !prop); 
          }}
        >
          WHY CHOOSE BOSSE?
        </div>
        <div className={`${isOpen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Flexibility in subject choice and examination, engaging and
            interesting study curriculum in Hindi, English and Regional
            Languages, Transfer of Credits up to four subjects, high-quality
            academic and employment-oriented programmes, and education at an
            affordable fee – all these make BOSSE a model Open Schooling Board
            in India.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenTwo((propTwo) => !propTwo);
          }}
        >
          HOW TO TAKE ADMISSION IN BOSSE?
        </div>
        <div className={`${isOpenTwo ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Admission to BOSSE is hassle-free, seamless and secure; interested
            candidates are required to fill the registration form, along with
            the requisite Fee, with the required documents to take admission in
            BOSSE. This can be done either online or at the nearest Admission
            Centre.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenThree((propThree) => !propThree);
          }}
        >
          WHO CAN TAKE ADMISSION IN BOOSE?
        </div>
        <div className={`${isOpenThree ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Anyone interested in upscaling his/her qualifications at
            Secondary/Sr. Secondary level is welcome! BOSSE’s Open and Distance
            Learning (ODL) System targets a diverse group of learners including
            school dropouts, failed students in Board examination, rural youth,
            working men and women and learners from the economically
            underprivileged sections of the society to obtain academic and
            skill-oriented Vocational Education.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-18 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenFour((propFour) => !propFour);
          }}
        >
          WHAT IS THE ELIGIBILITY CRITERIA FOR ADMISSION TO SECONDARY AND SENIOR
          SECONDARY LEVEL PROGRAMME AT BOOOSE?
        </div>
        <div className={`${isOpenFour ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Any person who has completed 15 years of age can apply for admission
            to the Secondary Programme, even if he/she has not undergone any
            formal education earlier. He/she will have to submit a valid proof
            of age as well as a certificate to the effect that he/she can read
            and understand the study materials as well as write an examination.
            A person who has passed class X can apply for admission to Senior
            Secondary Programme
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenFive((propFive) => !propFive);
          }}
        >
          WHAR ARE THE MEDIUMS OF STUDIES AVAILABLE IN BOSSE?
        </div>
        <div className={`${isOpenFive ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            At the moment, BOSSE offers Secondary and Senior Secondary level
            programmes in Hindi and English. Other mediums will be added as per
            demand.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h- bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenSix((propSix) => !propSix);
          }}
        >
          CAN A LEARNER TAKE VOCATIONAL SUBJECTS ALONG WITH ACADEMIC COURSES AT
          SECONDARY AND THE SENIOR SECONDARY LEVEL?
        </div>
        <div className={`${isOpenSix ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Yes, to make BOSSE courses more meaningful, vocational courses are
            offered independently or in combination with academic subjects at
            the Secondary and the Senior Secondary level. In fact, BOSSE
            encourages students to offer at least one vocational subject.
          </h1>
        </div>
      </div>
      <div>
        <div
          className=" bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenSeven((propSeven) => !propSeven);
          }}
        >
          CAN A LEARNER CHANGE A SUBJECT OR TAKE ADDITIONAL SUBJECTS?
        </div>
        <div className={`${isOpenSeven ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Candidates can change their subjects after taking admission and
            appearing in at least one examination. The fee for change of subject
            is Rs. 500/- per subject for Secondary as well as Senior Secondary
            programme. They can also take up to two Additional Subjects with the
            requisite fee.
          </h1>
        </div>
      </div>
      <div>
        <div
          className=" bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenEight((propEight) => !propEight);
          }}
        >
          WHAT IS THE PASS CERTIFICATION CRITERIA FOR SECONDARY AND SENIOR
          SECONDARY LEVEL PROGRAMME?
        </div>
        <div className={`${isOpenEight ? " hover: h-52" : "hidden"} `}>
          <h1 className="p-2 bg-slate-200 m-1">
            Pass Criteria:- In order to pass, one has to obtain 33% marks in
            aggregate of 5 subjects as well as a minimum of 33% marks
            (separately in theory and practical) in individual subjects. Theory
            also includes marks in Internal Assessment or CA (Continuous
            Assessment) with 20% weightage. Candidates have to pass in five
            subjects including at least one language. If a candidate has opted
            for one or 2 Additional Subjects, then one language and the best
            four out of the remaining subjects will be considered.
          </h1>
        </div>
      </div>
      <div>
        <div
          className=" bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenNine((propNine) => !propNine);
          }}
        >
          WHAT IS THE DURATION OF THE RESULT DECLRATUON AND AWARD OF
          CERTIFICATE?
        </div>
        <div className={`${isOpenNine ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            BOSSE declares results of Secondary and Senior Secondary programmes
            and dispatches the certificates within 45 to 60 working days after
            the examination ends.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenTen((propTen) => !propTen);
          }}
        >
          WHAT IS THE PROCEDURE OF VERIFICATION?
        </div>
        <div className={`${isOpenTen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            All letters/email pertaining verification of marksheets/migration
            should be sent to verification@bosse.ac.in or at the address
            specified under ‘Contact Us.’ Verification request will be
            entertained from Universities/Colleges/Schools or from those
            entities where the student has been hired. No charge will be
            applicable for verification from local institutions or entities. For
            verification charges from foreign institutions or entities kindly
            refer to our prospectus.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenEleven((propEleven) => !propEleven);
          }}
        >
          IS THE MARKSHEET VALID ALL OVER INDIA?
        </div>
        <div className={`${isOpenEleven ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            All our Recognition and Approvals along with positive RTI replies
            from different government universities are displayed on the website.
            Apart from that, in case you wish to enquire about the acceptance of
            marksheet in a particular institution or organization you may
            confirm the same from that particular institution.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenTwelve((propTwelve) => !propTwelve);
          }}
        >
          IS IT ENLISTED IN COBSE?
        </div>
        <div className={`${isOpenTwelve ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Yes, you may check the file in our Recognition and Approval section.
          </h1>
        </div>
      </div>
      <div>
        <div
          className=" bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenThriteen((propThirteen) => !propThirteen);
          }}
        >
          DO YOU PROVIDE A LEAVING CERTIFICATE OR CHARACTER CERITIFICATE?
        </div>
        <div className={`${isOpenThirteen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            No, we don’t provide character certificates, we do provide migration
            cum transfer certificates.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenFourteen((propFourteen) => !propFourteen);
          }}
        >
          IS IT VALID FOR PASSPORT?
        </div>
        <div className={`${isOpenFourteen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Kindly check the letter in our Recognition and Approval section.
          </h1>
        </div>
      </div>
      <div>
        <div
          className=" bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenFifteen((propFifteen) => !propFifteen);
          }}
        >
          WHAT ALL RECOGNITION AND APPROVALS THE BOARD HAVE?
        </div>
        <div className={`${isOpenFifteen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            All our Recognition and Approvals are displayed on the website under
            the “Recognition and Approvals” section. Please check.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenSixteen((propSixteen) => !propSixteen);
          }}
        >
          WHERE TO SEND RTI?
        </div>
        <div className={`${isOpenSixteen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            RTI letters can be sent to the address as specified under the
            “Contact us” section of the website.
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h-9 bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenSeventeen((propSeventeen) => !propSeventeen);
          }}
        >
          HOW TO APPLY FOR CORRECTIONS?f
        </div>
        <div className={`${isOpenSeventeen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Corrections should be intimated to your executive at least within 15
            days prior to exam or 10 days after exam. Thereafter , a fee of
            Rs.500 will be charged per document. For further information please
            contact your executive or call on the number displayed on website
          </h1>
        </div>
      </div>
      <div>
        <div
          className="h- bg-blue-900 m-1 text-white font-semibold p-2 cursor-pointer"
          onClick={() => {
            setIsOpenyEighteen((propEighteen) => !propEighteen);
          }}
        >
          HOW RO APPLY FOR A NEW MARKSHEET IF THE ORIGINAL IS LOST?
        </div>
        <div className={`${isOpenEighteen ? " hover: h-52" : "hidden"} `}>
          <h1 className="h-52 p-2 bg-slate-200 m-1">
            Students must file an FIR and send a copy of the same along with
            aadhar card, pay slip of rupees 500/- and marksheet copy to <br />
            <a
              href="contact@bosse.ac.in."
              className="text-sky-700 hover:underline"
            >
              contact@bosse.ac.in.
            </a>
            <br />
            New marksheet will be issued thereafter.
          </h1>
        </div>
      </div>
    </div>
  );
};

export default FAQSection;
