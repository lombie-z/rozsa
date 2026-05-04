import React from "react";
import type { PageBlocksTestimonial, PageBlocksTestimonialItem } from "@/lib/types";
import { Section } from "../layout/section";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent } from "../ui/card";

export const Testimonial = ({ data }: { data: PageBlocksTestimonial }) => {
  return (
    <Section background={data.background!}>
      <div className="text-center">
        <h2 className="text-title text-3xl font-semibold">{data.title}</h2>
        <p className="text-body mt-6">{data.description}</p>
      </div>
      <div className="mt-8 [column-width:300px] [column-gap:1.5rem] md:mt-12">
        {data.testimonials?.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial!} />
        ))}
      </div>
    </Section>
  );
};

const TestimonialCard = ({ testimonial }: { testimonial: PageBlocksTestimonialItem }) => {
  return (
    <Card className="mb-6 break-inside-avoid">
      <CardContent className="grid grid-cols-[auto_1fr] gap-3 pt-6">
        <Avatar className="size-9">
          {testimonial.avatar && (
            <AvatarImage alt={testimonial.author!} src={testimonial.avatar} loading="lazy" width="120" height="120" />
          )}
          <AvatarFallback>{testimonial.author!.split(" ").map((word) => word[0]).join("")}</AvatarFallback>
        </Avatar>

        <div>
          <h3 className="font-medium">{testimonial.author}</h3>
          <span className="text-muted-foreground block text-sm tracking-wide">{testimonial.role}</span>
          <blockquote className="mt-3">
            <p className="text-gray-700 dark:text-gray-300">{testimonial.quote}</p>
          </blockquote>
        </div>
      </CardContent>
    </Card>
  );
};
