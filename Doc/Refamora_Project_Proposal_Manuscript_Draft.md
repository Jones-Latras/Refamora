# Refamora Project Proposal Manuscript Draft

## 1. Title Page

**Proposed Title:**  
**Refamora: An AI-Assisted Mobile Marketplace for Agricultural Waste Exchange in the Philippines**

**Researchers:**  
[Insert researchers here]

**Adviser:**  
[Insert adviser here]

**Institution / Program:**  
[Insert institution and program here]

**Date:**  
[Insert date here]

## 2. Abstract

Refamora is a mobile marketplace prototype for agricultural waste exchange in the Philippines. The project was developed in response to a common problem in farming communities: many agricultural by-products still have value, but farmers do not always have an easy way to sell them, while buyers do not have a dedicated platform where they can find available materials. This study proposes and develops a dual-role mobile application that allows farmers to create and manage listings and allows buyers to search, filter, view locations, and send inquiries. The system was built using Expo React Native, Expo Router, Supabase Auth, Postgres, Storage, and Edge Functions, together with an AI layer for listing assistance, waste-to-value advice, photo checking, moderation, search interpretation, and seller messaging support. Based on the implemented prototype, the study shows that agricultural waste exchange can be organized more clearly through a digital system instead of relying only on scattered manual transactions. The application helps improve listing quality, supports safer posting through validation and review controls, and makes search and communication easier for users. The study concludes that an AI-assisted agri-waste marketplace can serve as a practical computing solution that supports waste reuse, better market access, and more efficient local resource circulation.

## 3. Introduction

### 3.1 Context and Background

Agricultural communities produce many by-products such as coconut husk, rice straw, corn stalks, banana trunk, sugarcane bagasse, pineapple leaves, and cassava peel. These materials are often seen as waste, even if they can still be used for composting, feed, biomass, fiber, and other purposes. Because of this, some materials are left unused, burned, dumped, or handled without much planning. One reason for this problem is that farmers may not have an easy way to connect with people or businesses that can still use these materials. On the other hand, buyers may also struggle to find available agricultural waste in their area. This situation reduces possible income for farmers and also limits the reuse of materials that still have value. Studies on agricultural waste management show that crop residues can support productive reuse when practical systems for recovery and exchange are available [1].

### 3.2 Brief Literature Summary

The literature shows two main ideas that are relevant to this study. First, circular economy and waste valorization studies explain that agricultural residues should not only be treated as waste, but also as resources that can still be used in other ways [1]. Second, digital agriculture research shows that mobile systems can help farmers gain better access to information, services, and market opportunities, especially when the systems are simple and useful in real situations [2]. Research on digital platforms also explains that systems with two user groups, such as sellers and buyers, need to reduce uncertainty for both sides if they want to work well [3].

### 3.3 Synthesis and Research Gap

Even though these studies are useful, there is still a gap when these ideas are put together. Agricultural waste studies often focus on treatment methods, policy, or energy use, while digital agriculture tools often focus on crops, farm inputs, or direct produce selling. E-marketplace studies for smallholders also mention problems such as trust, low visibility, logistics, digital literacy, and the challenge of attracting enough users to keep the platform active [4]. Because of this, there is still a need for a platform that is focused specifically on agricultural waste exchange and that helps users create better listings, find relevant materials, and communicate more easily.

### 3.4 Purpose and Objectives

This study aims to design and develop Refamora as an AI-assisted mobile marketplace for agricultural waste exchange. Specifically, it aims to: (1) provide a role-based platform for farmers and buyers; (2) support listing creation, discovery, and inquiry handling for agricultural waste materials; (3) integrate AI-assisted features such as listing improvement, waste-to-value suggestions, photo assessment, moderation, search support, and messaging assistance; and (4) build a system architecture that can be improved and expanded over time.

### 3.5 Significance and SDG Alignment

The project is significant because it uses computing to address a real environmental and livelihood issue. By making agricultural waste easier to list, search, and reuse, Refamora can help improve resource circulation and create possible income opportunities for farming communities. The system aligns with SDG 12 because it supports sustainable consumption and production and encourages waste reduction through reuse [7]. It also aligns with SDG 13 because better reuse practices can help reduce unmanaged disposal and support more climate-responsible handling of agricultural residues [8].

### 3.6 Scope and Limitations

The study is limited to the design and prototype implementation of a mobile application using Expo React Native, Supabase, and AI-enabled backend services. The current scope includes authentication, role selection, profile management, seller verification, listing creation and editing, buyer feed and map discovery, inquiry messaging, in-app notifications, seller and buyer dashboards, listing reporting, admin moderation and audit tools, app crash reporting, analytics logging, and several AI-assisted workflows. The prototype currently supports only selected agricultural waste categories and does not yet include integrated payments, delivery coordination, or large-scale deployment. Because of this, the project should be understood as a functional prototype and proposed system, not as a fully completed commercial platform.

## 4. Review of Related Literature (RRL)

### 4.1 Introduction

This review focuses on studies that help explain Refamora as both a technical system and a marketplace solution. The most relevant topics are agricultural waste valorization, digital agriculture adoption, two-sided platform design, e-marketplaces for smallholders, and trustworthy AI use. Together, these studies show that an agri-waste platform must do more than simply digitize listings. It must also improve visibility, usability, trust, and coordination between both sides of the exchange [1]-[6].

### 4.2 Theoretical Framework

Refamora is mainly connected to circular economy thinking. In this view, agricultural residues are not only leftover materials to be thrown away. They can also be redirected into new productive uses when there is a proper way to exchange them [1]. This idea fits the purpose of the app because each listing can be seen as a way of turning a farm by-product into something that can still be reused or sold.

The system can also be understood using two-sided platform theory. A marketplace creates value only when it can attract and connect two groups that depend on each other, which in this case are farmer-sellers and buyers [3]. Because of this, information quality becomes very important. Sellers need a simple way to post clear and credible listings, while buyers need trustworthy information before deciding to inquire. Since Refamora also uses AI in some user-facing features, the project is also related to trustworthy AI guidance that focuses on validation, monitoring, and risk management [6].

### 4.3 Methodological Review

Studies on mobile agricultural service applications show that adoption is more likely when users can clearly see the value of the tool in their daily activities [2]. This means that usefulness, simplicity, and good fit with local conditions are very important. The literature also warns that digital agriculture tools may not work well when they assume that users have strong internet access, high digital literacy, or the same behavior across different settings.

Research on e-marketplaces for smallholders supports this point. Going digital does not automatically guarantee that users will participate. Some users may still hesitate because of trust issues, low platform visibility, weak logistics support, or uncertainty about whether the platform will have enough active users [4]. These findings are relevant to Refamora because they show that the system should focus first on core exchange workflows and on features that reduce uncertainty for users.

### 4.4 Thematic Review

Three main themes appear in the literature. The first is waste valorization. Studies show that many agricultural by-products already have possible reuse pathways, but these pathways depend on systems that can connect available materials to possible users [1]. The second is market access through digital tools. Both academic and practitioner sources suggest that mobile systems can help smallholders reach services and buyers that may otherwise be hard to access [2], [5]. The third is trust and governance. Platform research shows that both sides of a marketplace need to be coordinated well [3], while AI governance guidance reminds developers that automated outputs should be validated and used carefully [6].

### 4.5 Synthesis

Across these sources, one important idea becomes clear: an agri-waste marketplace will not work well if it only acts as a simple posting board. The information in listings must be useful and understandable. The app must be easy to use. Buyers and sellers must feel more confident when using the platform. If AI is included, it should also be structured and checked instead of being used without control. Refamora brings these ideas together by combining listing workflows, discovery tools, messaging, and AI-supported quality controls in one application.

### 4.6 Closing Paragraph

The literature supports the relevance of Refamora and also helps explain its contribution. The project does not only focus on agricultural waste treatment, general digital agriculture, or general AI use. Instead, it focuses on a more specific problem: how to build a mobile platform that can help agricultural waste move from scattered local surplus into visible and reusable market supply.

## 5. Methodology

### 5.1 Introduction

This study uses a design-and-development methodology to propose, build, and examine a working mobile prototype of Refamora. The main goal at this stage is to produce a usable software artifact that addresses a clear problem in agricultural waste exchange. Because of that, the methodology focuses on system design, implementation, and evaluation of the major workflows in the prototype.

### 5.2 Research Design

The project follows a design science-oriented approach where a computing artifact is developed to address a practical problem. The problem identified in this study is the lack of a dedicated digital system for listing, finding, and coordinating agricultural waste exchange. The proposed solution is a dual-role mobile application for farmers and buyers, supported by Supabase services and an AI layer. The design process started with identifying the problem, followed by defining user workflows, implementing the needed features, and then checking whether the final prototype behaved as expected.

### 5.3 Data Collection Methods

System requirements were gathered through analysis of the intended user flows in the app. Two main user roles shaped these requirements: farmer-sellers and buyer-users. For farmers, the important data points included waste type, title, description, image, quantity, price, location, fulfillment options, listing status, and inquiries received. For buyers, the important data points included search terms, filters, saved listings, recently viewed listings, map pins, and conversation records. Additional implementation data also came from the prototype itself, including listings, inquiry states, engagement events, moderation queue records, AI event logs, and feedback records. Verification was done using controlled app scenarios and seeded records that represented common user actions.

### 5.4 Data Analysis Methods

The prototype was analyzed using descriptive and functional review. Each major workflow was checked based on its expected behavior. These workflows included farmer listing creation, image upload, duplication and editing, buyer search and filtering, map-based discovery, inquiry messaging, reporting, and dashboard summaries. AI-supported workflows were also reviewed through schema validation, provider response handling, event logging, feedback capture, and fallback or review behavior. Backend analysis included database constraints, row-level security rules, and service-layer error handling. The purpose of the analysis was to see whether the implemented system supported the intended exchange process in a reliable and controlled way.

### 5.5 Ethical Considerations

Ethical considerations were addressed at the system level. Access is authenticated, user roles are separated, and row-level security policies limit who can read or write specific records. The system stores only the data needed for platform operation, such as profile details, listings, and inquiry messages. AI outputs are validated before use, and moderation-sensitive cases can be sent to a review queue instead of being accepted automatically. Rate limiting, AI event logging, and feedback submission also help support accountability. In short, the system treats AI as a support tool rather than a final decision-maker.

### 5.6 Methodological Limitations

The methodology is limited by the current stage of the prototype. It does not yet include a formal user study, large-scale deployment, integrated payment features, or logistics coordination. The supported waste categories are also limited, and the AI features still depend on provider availability, network conditions, and the quality of user input. Because of this, the findings of the study should be understood as implementation-level results rather than large-scale impact claims.

### 5.7 Conclusion

This methodology is appropriate for a project proposal focused on software development. It allows the study to show that the proposed solution can be built, that its main features work together properly, and that the system is grounded in the actual problem of agricultural waste exchange.

## 6. Results and Discussion

### 6.1 Summary of Key Results

The main result of the project is the successful implementation of Refamora as a role-based mobile marketplace prototype for agricultural waste exchange. Farmers can create, edit, duplicate, and manage listings that contain waste type, price, quantity, fulfillment options, images, and location. Farmers can also undergo a verification process to gain a verified seller badge, increasing trust. Buyers can search listings, apply filters, use location-aware sorting, save possible options, review recently viewed materials, and open inquiry conversations with sellers. Both roles receive real-time in-app notifications for messaging and verification updates. The prototype also includes seller and buyer dashboards, listing activity summaries, reporting tools, an admin moderation dashboard with audit logging and crash reporting, and backend analytics for views and inquiries.

Aside from the basic marketplace flow, the system also includes an AI service layer. Listing assistance can help improve titles and descriptions. Waste-to-value advice can suggest possible uses of agricultural waste. Photo checking can assess image quality and suggest likely waste categories. Moderation can flag suspicious or unsafe submissions. Search assistance can help interpret buyer intent, and inquiry support can summarize inbox activity or draft replies. These features show that the prototype is not only a listing platform, but also a system with built-in support for better decision-making.

### 6.2 Integrated Interpretation Across Chapters

Taken together, the results support the main argument of the study: the agricultural waste problem is not only about the materials themselves, but also about coordination. The materials may already be available, and possible buyers may already exist, but without a usable exchange system the connection between them stays weak. The prototype addresses this gap by combining listing structure, buyer discovery, location context, messaging, analytics, and publishing controls in one workflow. This combination is important because the platform works best when these features support each other.

### 6.3 Comparison with Literature

The prototype is consistent with studies that treat agricultural waste as a resource that can still be reused in more circular ways [1]. It also agrees with research showing that mobile systems can improve access to market opportunities for smallholder users when the tools are simple and directly useful [2]. From a platform perspective, Refamora responds to the coordination problem described in two-sided market research by reducing uncertainty for both sellers and buyers [3]. Compared with broader e-marketplace studies for smallholders, this project focuses more specifically on agricultural waste instead of general produce selling or farm commerce [4], [5].

### 6.4 Implications for Computing and Programming

From a computing perspective, Refamora shows the value of modular full-stack design for a domain-specific mobile system. The separation between the mobile client, service layer, database rules, storage, and Edge Functions helps keep the system organized and easier to improve. Typed service interfaces, schema validation, event logging, and clear error handling also help improve reliability. The AI layer shows a practical way of using AI more responsibly because the outputs are structured, validated, rate-limited, logged, and connected to review mechanisms when necessary.

### 6.5 Alignment with at Least Two SDGs

Refamora aligns strongly with SDG 12 because it supports the reuse of agricultural by-products and encourages more sustainable consumption and production patterns [7]. It also aligns with SDG 13 because improved reuse pathways can help reduce unmanaged disposal and support more climate-conscious handling of agricultural residues [8]. A secondary connection can also be made to SDG 8 since the platform is designed to create additional livelihood opportunities for farmers and local circular-economy enterprises.

### 6.6 Discussion and Conclusion

The most important finding is that the value of the prototype comes from integration. Search alone is not enough if listings are unclear. Listings alone are not enough if buyers cannot discover them easily. Messaging also becomes less useful if sellers do not have support in handling inquiries. AI can also become risky if it is used without validation. Refamora works because these parts are connected through clear workflows, service logic, validation, and review controls.

At the same time, the project is still a prototype. It still needs field validation, wider category coverage, stronger deployment evidence, and more study of adoption barriers in real farming communities. Even with these limitations, the current implementation already supports the main claim of the proposal: an AI-assisted mobile marketplace can be a practical and technically reasonable approach to agricultural waste exchange.

## 7. References

[1] M. Mallikarjuna Rao et al., "A comprehensive review on agricultural waste production and onsite management with circular economy opportunities," *Discover Sustainability*, vol. 5, art. no. 288, 2024, doi: 10.1007/s43621-024-00492-z.

[2] P. Muromba, M. Keeni, and K. Fuyuki, "A systematic review of mobile agricultural service applications for smallholder farmers in sub-Saharan Africa: perspectives from the technology acceptance model," *Agriculture & Food Security*, vol. 14, art. no. 34, 2025, doi: 10.1186/s40066-025-00563-y.

[3] J. Veisdal, "The dynamics of entry for digital platforms in two-sided markets: a multi-case study," *Electronic Markets*, vol. 30, pp. 539-556, 2020, doi: 10.1007/s12525-020-00409-4.

[4] J. M. Garcia-Gallego, A. Chamorro-Mera, V. Valero-Amaro, M. Martinez-Jimenez, P. Romero, M. T. Miranda, and S. Rubio, "Agri-Food E-Marketplaces as New Business Models for Smallholders: A Case Analysis in Spain," *Agriculture*, vol. 15, no. 17, art. no. 1806, 2025, doi: 10.3390/agriculture15171806.

[5] World Food Programme, "New mobile app to improve market access for smallholder farmers," Jul. 13, 2021. [Online]. Available: https://www.wfp.org/news/new-mobile-app-improve-market-access-smallholder-farmers

[6] National Institute of Standards and Technology, "AI Risk Management Framework," Jan. 26, 2023. [Online]. Available: https://www.nist.gov/itl/ai-risk-management-framework

[7] United Nations, "Sustainable Development Goal 12: Responsible Consumption and Production." [Online]. Available: https://pacific.un.org/en/sdgs/12

[8] United Nations, "Sustainable Development Goal 13: Climate Action." [Online]. Available: https://caribbean.un.org/en/sdgs/13

## Note

This draft is still intentionally tied to the current Refamora implementation. If your adviser wants a longer RRL, more Philippine-local studies, or stricter IEEE formatting, those should be added in the next pass.
