import "./App.css";
import React, { useState } from "react";
import Header from "./Header";
import Carousel from "./Carousel";
import Form from "./Form";
import RunningLine from "./RunningLine";
import Syllabus from "./Syllabus";

function App() {
  const images = [
    "/images/slider/b1.jpg",
    "/images/slider/b2.jpg",
    "/images/slider/b3.jpg",
    "/images/slider/b4.jpg",
    "/images/slider/b5.jpg",
    "/images/slider/b6.jpg",
    "/images/slider/b7.jpg",
    "/images/slider/b9.jpg",
    "/images/slider/b10.jpg",
  ];
  return (
    <>
      <Header />
      <main className="flex justify-center items-center min-h-14 bg-gray-100">
        <Carousel images={images} />
      </main>
      <div>
        <h1 className="text-center my-5  text-blue-900 font-serif text-2xl">
          ABOUT US
        </h1>
        <div className=" text-center text-wrap p-5 my-5">
          <span className="font-semibold text-center text-2xl">
            Welcome to Children's Valley English School Play Group to Class 10th
            <br />
          </span>
          <p className="text-lg font-serif p-2 m-5">
            At Children's Valley English School, we are dedicated to nurturing
            young minds and shaping bright futures. Our school offers a safe,
            inspiring, and inclusive environment where every child is encouraged
            to explore, learn, and grow.
          </p>

          <p className="text-lg font-serif p-2 m-5">
            English Language & Literature Mathematics General Science Social
            Studies Environmental Awareness Information Technology We regularly
            assess student progress with formative and summative evaluations,
            ensuring personalized support and improvement plans.
          </p>
          <p className="text-lg font-serif p-2 m-5">
            Our Mission To deliver high-quality education with a focus on
            knowledge, skills, and values. To cultivate critical thinking,
            innovation, and a lifelong love for learning. To promote holistic
            development through academics, sports, arts, and community
            engagement. To nurture respect, integrity, and empathy among
            students, staff, and parents.
          </p>
        </div>
        <RunningLine />
        <div className="flex justify-center">
          <div className="bg-cyan-500 rounded-b-3xl m-5 p-2 lg:h-60 lg:w-[40rem] text-center">
            <h1 className="text-center text-2xl border-b ">NOTICE</h1>
            <p className="font-serif p-5 ">
              Filling the application form available at the school or online.
              Submitting necessary documents (birth certificate, previous school
              records, photographs). Attending a counseling session or
              assessment <br /> (if applicable). Paying the admission and
              tuition fees. Contact our admission office for detailed guidance.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center  bg-primaryBlue  duration-300">
        <Form />
      </div>
      <Syllabus />
      <div className="h-full w-full bg-primaryGreen p-5">
        <h1 className="text-2xl  underline ">Our Facilities & Activities</h1>
        <p className="text-wrap  m-3 text-white">
          Well-Equipped Classrooms Bright, spacious, and child-friendly
          classrooms designed to foster creativity and learning.
        </p>
        <h1 className="text-2xl  underline ">Science Lab</h1>
        <p className="text-wrap  m-3 text-white">
          Hands-on experiments and interactive learning to spark curiosity and
          scientific thinking.
        </p>
        <h1 className="text-2xl  underline ">Computer Lab</h1>
        <p className="text-wrap  m-3 text-white">
          Modern computers and technology classes to prepare students for the
          digital world.
        </p>
        <h1 className="text-2xl  underline ">Sports & Games</h1>
        <p className="text-wrap  m-3 text-white">
          Encouraging physical fitness and teamwork through various sports
          activities.
        </p>
        <h1 className="text-2xl  underline ">Yoga & Meditation</h1>
        <p className="text-wrap  m-3 text-white">
          Promoting mental well-being and concentration through regular yoga
          sessions.
        </p>
        <h1 className="text-2xl  underline ">Dance & Creative Arts</h1>
        <p className="text-wrap  m-3 text-white">
          Nurturing talent and confidence through dance, music, and art classes.
        </p>
        <h1 className="text-2xl  underline ">Extra Curricular Activities</h1>
        <p className="text-wrap  m-3 text-white">
          Regular events and clubs to explore student’s unique interests and
          skills.
        </p>
        <h1 className="text-2xl  underline ">Our Teaching Staff</h1>
        <p className="text-wrap  m-3 text-white">
          Our experienced and passionate teachers are committed to providing
          quality education and support. They focus on making learning enjoyable
          and meaningful for every child.
        </p>
        <h1 className="text-2xl  underline ">Admissions</h1>
        <p className="text-wrap  m-3 text-white">
          Enroll your child at Children’s Valley English School today. We
          welcome young learners from the Play Group stage and prepare them for
          academic success up to Class 10.
        </p>
      </div>
      <footer className="w-full h-[30rem] lg:h-80 md:h-80 bg-primaryBlue  text-white">
        <h1 className=" font-serif text-2xl p-3 lg:border-none border-b ">
          Contact Us
        </h1>
        <p className="px-3 m-5 text-2xl lg:border-none border-b ">
          We would love to hear from you! For admissions, queries, or to
          schedule a visit, please reach out.
        </p>
        <p className="px-3 m-5 text-2xl lg:border-none border-b">
          <span className="font-bold px-5">Phone :</span>
          <span className=" hover:text-black duration-500">
            <a href="tel:9336576690">9336576690, </a>
          </span>
          <span className="hover:text-black duration-500">
            <a href="tel:8081667099">8081667099</a>
          </span>
        </p>

        <p className="px-3 m-5 text-2xl ">
          <span className="font-bold px-5">Address :</span> Near Galaxy Hospital
          Mahmoorganj,Varanasi
        </p>
      </footer>
    </>
  );
}

export default App;
